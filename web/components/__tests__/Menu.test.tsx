import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Menu from '@/components/ui/Menu';

afterEach(() => {
  cleanup();
});

function renderMenu(items: Parameters<typeof Menu>[0]['items']) {
  const user = userEvent.setup();
  const utils = render(<Menu ariaLabel="More options" trigger={<span>more</span>} items={items} />);
  return { ...utils, user };
}

describe('Menu', () => {
  it('wires the trigger with aria-haspopup/aria-expanded/aria-controls and exposes menu roles', async () => {
    const { user } = renderMenu([
      { label: 'Edit', onClick: vi.fn() },
      { label: 'Checked', onClick: vi.fn(), checked: true },
    ]);
    const trigger = screen.getByRole('button', { name: 'More options' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const controlsId = trigger.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(trigger);
    const menu = screen.getByRole('menu', { name: 'More options' });
    expect(menu.id).toBe(controlsId);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    const checkbox = screen.getByRole('menuitemcheckbox', { name: 'Checked' });
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('moves focus with ArrowDown/ArrowUp (skipping disabled items, wrapping) and Home/End jump to first/last', async () => {
    const { user } = renderMenu([
      { label: 'One', onClick: vi.fn() },
      { label: 'Two', onClick: vi.fn(), disabled: true },
      { label: 'Three', onClick: vi.fn() },
    ]);
    await user.click(screen.getByRole('button', { name: 'More options' }));
    const one = screen.getByRole('menuitem', { name: 'One' });
    const three = screen.getByRole('menuitem', { name: 'Three' });
    expect(one).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(three).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(one).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(three).toHaveFocus();
    await user.keyboard('{Home}');
    expect(one).toHaveFocus();
    await user.keyboard('{End}');
    expect(three).toHaveFocus();
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    const { user } = renderMenu([{ label: 'One', onClick: vi.fn() }]);
    const trigger = screen.getByRole('button', { name: 'More options' });
    await user.click(trigger);
    const item = screen.getByRole('menuitem', { name: 'One' });
    expect(item).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('selecting an item fires its onClick, closes the menu, and restores focus to the trigger', async () => {
    const onChoose = vi.fn();
    const { user } = renderMenu([{ label: 'Choose uniform', onClick: onChoose }]);
    const trigger = screen.getByRole('button', { name: 'More options' });
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Choose uniform' }));

    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('opens from the trigger with ArrowDown onto the first item and ArrowUp onto the last', async () => {
    const { user } = renderMenu([
      { label: 'One', onClick: vi.fn() },
      { label: 'Two', onClick: vi.fn() },
      { label: 'Three', onClick: vi.fn() },
    ]);
    const trigger = screen.getByRole('button', { name: 'More options' });
    trigger.focus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'One' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Three' })).toHaveFocus();
  });
});
