export type Deck = { id:string; name:string };
export type Word = { id:string; deckId:string; term:string; pinyin:string; meaning:string };
export type Library = { decks:Deck[]; words:Word[]; revision:string; sourceKey:string; demo?:boolean };
export type Source = { spreadsheetId:string; tab:string };
export type ImportRow = { row:number; id:string; deck:string; term:string; pinyin:string; meaning:string; errors:string[]; duplicate:boolean };
