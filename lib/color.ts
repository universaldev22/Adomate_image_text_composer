export function rgbToHex(input: string){
  if(!input) return '#ffffff';
  if(input.startsWith('#')) return input.toLowerCase();
  const lower = input.toLowerCase();
  if(!lower.startsWith('rgb')) return '#ffffff';
  const cleaned = Array.from(lower).filter(ch => (ch >= '0' && ch <= '9') || ch === ',').join('');
  const nums = cleaned.split(',').slice(0,3).map(s => Math.max(0, Math.min(255, parseInt(s||'0', 10))));
  if(nums.length < 3 || nums.some(n => Number.isNaN(n))) return '#ffffff';
  const [r,g,b] = nums;
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
