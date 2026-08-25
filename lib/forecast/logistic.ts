// Fits the deterministic logistic candidate and selects its L2 penalty without crossing the
// development/holdout boundary. Every rolling-origin fold owns preprocessing fitted only from
// earlier raw seasons, so validation values cannot influence imputation or scaling.

import { DEVELOPMENT_SEASONS } from './contracts';
import type { RawForecastExample } from './dataset';
import { fitPreprocessor, transformExamples, type ModelExample } from './preprocessing';

export interface LogisticConfig {
  l2: number;
  maxIterations: 100;
  tolerance: 1e-10;
  probabilityEpsilon: 1e-12;
}

export interface LogisticModel {
  intercept: number;
  coefficients: number[];
  config: LogisticConfig;
  iterations: number;
  converged: boolean;
}

export interface RegularizationSelection {
  selectedL2: number;
  candidates: Array<{
    l2: number;
    pooledLogLoss: number;
    folds: Array<{ validationSeason: number; games: number; logLoss: number }>;
  }>;
}

const L2_CANDIDATES = Object.freeze([0.0001, 0.001, 0.01, 0.1, 1]);
const VALIDATION_SEASONS = Object.freeze(Array.from({ length: 7 }, (_, index) => 2016 + index));
const DEVELOPMENT_SEASON_SET = new Set<number>(DEVELOPMENT_SEASONS);

function assertFinite(value: number, description: string): void {
  if (!Number.isFinite(value)) throw new Error(`Non-finite ${description}`);
}

function validateConfig(config: LogisticConfig): void {
  assertFinite(config.l2, 'L2 penalty');
  assertFinite(config.maxIterations, 'maximum iterations');
  assertFinite(config.tolerance, 'convergence tolerance');
  assertFinite(config.probabilityEpsilon, 'probability epsilon');
  if (config.l2 < 0) throw new Error('L2 penalty must be non-negative');
  if (!Number.isInteger(config.maxIterations) || config.maxIterations <= 0) {
    throw new Error('Maximum iterations must be a positive integer');
  }
  if (config.tolerance <= 0) throw new Error('Convergence tolerance must be positive');
  if (config.probabilityEpsilon <= 0 || config.probabilityEpsilon >= 0.5) {
    throw new Error('Probability epsilon must be between zero and one half');
  }
}

function validateExamples(examples: ModelExample[]): number {
  if (examples.length === 0) throw new Error('Cannot fit logistic regression without examples');
  const featureCount = examples[0].featureValues.length;
  let observedLoss = false;
  let observedWin = false;

  for (const example of examples) {
    if (example.featureValues.length !== featureCount) {
      throw new Error('Logistic feature vector length mismatch');
    }
    if (example.label !== 0 && example.label !== 1) {
      throw new Error('Logistic labels must be zero or one');
    }
    observedLoss ||= example.label === 0;
    observedWin ||= example.label === 1;
    assertFinite(example.season, 'example season');
    assertFinite(example.week, 'example week');
    assertFinite(example.marketHomeProbability, 'market probability');
    for (const value of example.featureValues) assertFinite(value, 'logistic feature value');
  }

  // With an unregularized intercept, a one-class sample has no finite maximum-likelihood fit.
  if (!observedLoss || !observedWin) {
    throw new Error('Logistic regression cannot converge without both outcome classes');
  }
  return featureCount;
}

function sigmoid(linearPredictor: number): number {
  if (linearPredictor >= 0) {
    const exponent = Math.exp(-linearPredictor);
    return 1 / (1 + exponent);
  }
  const exponent = Math.exp(linearPredictor);
  return exponent / (1 + exponent);
}

function solveLinearSystem(matrix: number[][], rightHandSide: number[]): number[] {
  const dimension = rightHandSide.length;
  const coefficients = matrix.map((row) => [...row]);
  const values = [...rightHandSide];
  const matrixScale = Math.max(1, ...coefficients.flat().map(Math.abs));
  const singularThreshold = Number.EPSILON * matrixScale * Math.max(1, dimension);

  // Partial pivoting always retains the first row on equal magnitudes, locking tie behavior.
  for (let column = 0; column < dimension; column += 1) {
    let pivotRow = column;
    for (let row = column + 1; row < dimension; row += 1) {
      if (Math.abs(coefficients[row][column]) > Math.abs(coefficients[pivotRow][column])) {
        pivotRow = row;
      }
    }
    if (Math.abs(coefficients[pivotRow][column]) <= singularThreshold) {
      throw new Error('Singular logistic normal equations after L2 regularization');
    }
    if (pivotRow !== column) {
      [coefficients[column], coefficients[pivotRow]] = [
        coefficients[pivotRow],
        coefficients[column],
      ];
      [values[column], values[pivotRow]] = [values[pivotRow], values[column]];
    }

    for (let row = column + 1; row < dimension; row += 1) {
      const factor = coefficients[row][column] / coefficients[column][column];
      coefficients[row][column] = 0;
      for (let inner = column + 1; inner < dimension; inner += 1) {
        coefficients[row][inner] -= factor * coefficients[column][inner];
      }
      values[row] -= factor * values[column];
    }
  }

  const solution = Array<number>(dimension).fill(0);
  for (let row = dimension - 1; row >= 0; row -= 1) {
    let value = values[row];
    for (let column = row + 1; column < dimension; column += 1) {
      value -= coefficients[row][column] * solution[column];
    }
    solution[row] = value / coefficients[row][row];
    assertFinite(solution[row], 'logistic solve result');
  }
  return solution;
}

export function fitLogisticRegression(
  examples: ModelExample[],
  config: LogisticConfig
): LogisticModel {
  validateConfig(config);
  const featureCount = validateExamples(examples);
  const parameterCount = featureCount + 1;
  const parameters = Array<number>(parameterCount).fill(0);
  const sampleScale = 1 / examples.length;

  for (let iteration = 1; iteration <= config.maxIterations; iteration += 1) {
    const gradient = Array<number>(parameterCount).fill(0);
    const hessian = Array.from({ length: parameterCount }, () =>
      Array<number>(parameterCount).fill(0)
    );

    for (const example of examples) {
      const designRow = [1, ...example.featureValues];
      const linearPredictor = designRow.reduce(
        (sum, value, index) => sum + value * parameters[index],
        0
      );
      const probability = sigmoid(linearPredictor);
      const weightedProbability = Math.min(
        1 - config.probabilityEpsilon,
        Math.max(config.probabilityEpsilon, probability)
      );
      const weight = weightedProbability * (1 - weightedProbability);
      const residual = probability - example.label;

      for (let row = 0; row < parameterCount; row += 1) {
        gradient[row] += designRow[row] * residual * sampleScale;
        for (let column = 0; column <= row; column += 1) {
          const contribution = designRow[row] * designRow[column] * weight * sampleScale;
          hessian[row][column] += contribution;
          if (row !== column) hessian[column][row] += contribution;
        }
      }
    }

    // The objective is average NLL plus l2 / 2 * sum(beta^2); index zero is the intercept.
    for (let index = 1; index < parameterCount; index += 1) {
      gradient[index] += config.l2 * parameters[index];
      hessian[index][index] += config.l2;
    }

    const step = solveLinearSystem(hessian, gradient);
    let largestChange = 0;
    for (let index = 0; index < parameterCount; index += 1) {
      parameters[index] -= step[index];
      assertFinite(parameters[index], 'logistic coefficient');
      largestChange = Math.max(largestChange, Math.abs(step[index]));
    }

    if (largestChange <= config.tolerance) {
      return {
        intercept: parameters[0],
        coefficients: parameters.slice(1),
        config: { ...config },
        iterations: iteration,
        converged: true,
      };
    }
  }

  throw new Error(
    `Logistic regression failed to converge within ${config.maxIterations} iterations`
  );
}

export function predictProbability(model: LogisticModel, featureValues: number[]): number {
  if (featureValues.length !== model.coefficients.length) {
    throw new Error('Logistic prediction feature vector length mismatch');
  }
  assertFinite(model.intercept, 'logistic intercept');
  let linearPredictor = model.intercept;
  for (let index = 0; index < featureValues.length; index += 1) {
    assertFinite(featureValues[index], 'logistic prediction feature value');
    assertFinite(model.coefficients[index], 'logistic model coefficient');
    linearPredictor += featureValues[index] * model.coefficients[index];
  }
  return sigmoid(linearPredictor);
}

function totalLogLoss(model: LogisticModel, examples: ModelExample[]): number {
  return examples.reduce((sum, example) => {
    const probability = predictProbability(model, example.featureValues);
    const clipped = Math.min(
      1 - model.config.probabilityEpsilon,
      Math.max(model.config.probabilityEpsilon, probability)
    );
    return sum - (example.label === 1 ? Math.log(clipped) : Math.log(1 - clipped));
  }, 0);
}

export function selectRegularization(
  rawDevelopmentExamples: RawForecastExample[]
): RegularizationSelection {
  if (rawDevelopmentExamples.length === 0) {
    throw new Error('Cannot select regularization without development examples');
  }
  for (const example of rawDevelopmentExamples) {
    if (!DEVELOPMENT_SEASON_SET.has(example.season)) {
      throw new Error(`Season ${example.season} is outside the development window`);
    }
  }

  // Preprocessing is fit once per chronological fold, never once across the full development set.
  const folds = VALIDATION_SEASONS.map((validationSeason) => {
    const rawTraining = rawDevelopmentExamples.filter(
      (example) => example.season >= 2012 && example.season < validationSeason
    );
    const rawValidation = rawDevelopmentExamples.filter(
      (example) => example.season === validationSeason
    );
    if (rawTraining.length === 0 || rawValidation.length === 0) {
      throw new Error(
        `Rolling-origin fold ${validationSeason} requires training and validation games`
      );
    }
    const preprocessor = fitPreprocessor(rawTraining);
    return {
      validationSeason,
      training: transformExamples(rawTraining, preprocessor),
      validation: transformExamples(rawValidation, preprocessor),
    };
  });

  const candidates = L2_CANDIDATES.map((l2) => {
    let pooledGames = 0;
    let pooledLoss = 0;
    const candidateFolds = folds.map((fold) => {
      const model = fitLogisticRegression(fold.training, {
        l2,
        maxIterations: 100,
        tolerance: 1e-10,
        probabilityEpsilon: 1e-12,
      });
      const loss = totalLogLoss(model, fold.validation);
      pooledGames += fold.validation.length;
      pooledLoss += loss;
      return {
        validationSeason: fold.validationSeason,
        games: fold.validation.length,
        logLoss: loss / fold.validation.length,
      };
    });
    return { l2, pooledLogLoss: pooledLoss / pooledGames, folds: candidateFolds };
  });

  const selected = candidates.reduce((best, candidate) => {
    if (candidate.pooledLogLoss < best.pooledLogLoss) return candidate;
    if (candidate.pooledLogLoss === best.pooledLogLoss && candidate.l2 > best.l2) {
      return candidate;
    }
    return best;
  });
  return { selectedL2: selected.l2, candidates };
}
