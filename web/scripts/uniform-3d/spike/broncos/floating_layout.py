"""Vertical offsets for the floating uniform's garment groups."""


def offsets(bounds, layout):
    pants = bounds['jersey'][0] + layout['jersey_pants_overlap'] - bounds['pants'][1]
    socks = bounds['pants'][0] + pants - layout['pants_socks_gap'] - bounds['socks'][1]
    helmet = bounds['jersey'][1] + layout['helmet_jersey_gap'] - bounds['helmet'][0]
    return {'pants': pants, 'socks': socks, 'helmet': helmet}
