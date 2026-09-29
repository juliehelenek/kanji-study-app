export type KanjiStatus = 'new' | 'unfamiliar' | 'familiar' | 'mastered';

export type Vocab = {
  word: string;
  reading: string;
  meaning: string;
  example?: string;
};

export type Kanji = {
  character: string;
  keyword: string;
  onyomi: string[];
  kunyomi: string[];
  mnemonic: string;
  vocab: Vocab[];
  status: KanjiStatus;
};

// Small starter dataset based on the supplied textbook photo.
export const starterKanji: Kanji[] = [
  {
    character: '不', keyword: 'NOT / un-', onyomi: ['フ'], kunyomi: [],
    mnemonic: 'Imagine a bird trying to fly upward but being halted: it goes… NOT.',
    vocab: [
      { word: '不用', reading: 'ふよう', meaning: 'of no use' },
      { word: '不正', reading: 'ふせい', meaning: 'injustice; wrong; illegality' },
      { word: '不足', reading: 'ふそく', meaning: 'insufficiency; want; dissatisfaction' }
    ], status: 'new'
  },
  {
    character: '回', keyword: 'TURN ROUND / TIME', onyomi: ['カイ', 'エ'], kunyomi: ['まわる', 'まわす'],
    mnemonic: 'Picture a wheel-like shape. Count each TIME it turns round.',
    vocab: [
      { word: '回る', reading: 'まわる', meaning: 'turn around' },
      { word: '回す', reading: 'まわす', meaning: 'turn around' },
      { word: '一回', reading: 'いっかい', meaning: 'one time; once' }
    ], status: 'new'
  },
  {
    character: '言', keyword: 'SAY / SPEECH / word', onyomi: ['ゲン', 'ゴン'], kunyomi: ['いう', 'こと'],
    mnemonic: 'Four horizontal lines are sound waves coming from the small mouth at the bottom: SPEECH.',
    vocab: [
      { word: '言う', reading: 'いう', meaning: 'say; speak; state; call; refer to' },
      { word: '言語', reading: 'げんご', meaning: 'language' },
      { word: '一言', reading: 'ひとこと', meaning: 'a word' }
    ], status: 'new'
  },
  {
    character: '舌', keyword: 'TONGUE', onyomi: ['ゼツ'], kunyomi: ['した'],
    mnemonic: 'A mouth at the bottom with a TONGUE sticking out toward the top.',
    vocab: [
      { word: '舌', reading: 'した', meaning: 'tongue' },
      { word: '舌がもつれる', reading: 'したがもつれる', meaning: 'one’s tongue gets twisted' }
    ], status: 'new'
  }
];
