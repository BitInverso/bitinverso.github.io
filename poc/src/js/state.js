export const GS = () => (window.gameState || window.GS || null);
export const setGS = (gs) => { window.gameState = gs; return gs; };