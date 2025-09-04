export const openDictionary = (w) => window.openDictionary?.(w);
export const annotateDialogueText = (t) => window.annotateDialogueText?.(t) ?? (t||"");