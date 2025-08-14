import { describe, it, expect } from 'vitest';
import { rgbToHex } from './color';

describe('rgbToHex', () => {
  it('converts rgb()', () => {
    expect(rgbToHex('rgb(255, 0, 0)')).toBe('#ff0000');
  });
  it('converts rgba() ignoring alpha', () => {
    expect(rgbToHex('rgba(34, 68, 170, 0.5)')).toBe('#2244aa');
  });
  it('passes through #hex', () => {
    expect(rgbToHex('#123456')).toBe('#123456');
  });
  it('handles spaced rgb()', () => {
    expect(rgbToHex('rgb( 1 , 2 , 3 )')).toBe('#010203');
  });
  it('falls back to white on invalid', () => {
    expect(rgbToHex('not-a-color')).toBe('#ffffff');
  });
});
