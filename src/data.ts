export type KanjiStatus = 'new' | 'unfamiliar' | 'familiar' | 'mastered';

export type ReviewTrack = {
  intervalDays: number;
  nextReviewAt: number;
  successes: number;
  lapses: number;
};

export type KanjiProgress = {
  mnemonic: ReviewTrack;
  writing: ReviewTrack;
  reading: ReviewTrack;
};

export type TextbookStage = 'mnemonic' | 'meaning' | 'writing' | 'reading' | 'vocabulary' | 'recall';

export type Vocab = {
  word: string;
  reading: string;
  meaning: string;
  example?: string;
};

export type Kanji = {
  /** Position in the textbook sequence; independent of the current deck order. */
  textbookId?: number;
  character: string;
  keyword: string;
  onyomi: string[];
  kunyomi: string[];
  mnemonic: string;
  vocab: Vocab[];
  status: KanjiStatus;
  progress?: KanjiProgress;
  textbookProgress?: Partial<Record<TextbookStage, boolean>>;
};

type VocabRow = [word: string, reading: string, meaning: string];

const textbookEntry = (textbookId: number, character: string, keyword: string, onyomi: string[], kunyomi: string[], rows: VocabRow[]): Kanji => ({
  textbookId,
  character,
  keyword,
  onyomi,
  kunyomi,
  mnemonic: `Recall “${keyword}” when you see ${character}.`,
  vocab: rows.map(([word, reading, meaning]) => ({ word, reading, meaning })),
  status: 'new',
});

// Vocabulary transcribed from the supplied textbook pages (entries 1–40).
export const kanjiList: Kanji[] = [
  textbookEntry(1, '日', 'SUN / DAY / JAPAN', ['ニチ', 'ジツ'], ['ひ', 'び', '-か'], [
    ['日々', 'ひび', 'daily; days'], ['日にち', 'ひにち', 'date; number of days'], ['日に日に', 'ひにひに', 'day by day; every day'], ['ある日', 'あるひ', 'one day; a certain day'], ['日ソ', 'にっソ', 'Japan and the Soviet Union'],
  ]),
  textbookEntry(2, '一', 'ONE', ['イチ', 'イツ'], ['ひと-', 'ひと(つ)'], [
    ['一日', 'いちにち', 'one day'], ['一日', 'ついたち', 'first day of the month'], ['一々', 'いちいち', 'one by one; in detail'], ['一つ', 'ひとつ', 'one (of something)'], ['一つずつ', 'ひとつずつ', 'one at a time'],
  ]),
  textbookEntry(3, '二', 'TWO', ['ニ'], ['ふた-', 'ふた(つ)'], [
    ['二日', 'ふつか', 'two days; second day of the month'], ['二メートル', 'にメートル', 'two meters'], ['二ラウンド', 'にラウンド', 'two rounds; Round 2'], ['レモン二つ', 'レモンふたつ', 'two lemons'], ['一つ二つ', 'ひとつふたつ', 'one or two'],
  ]),
  textbookEntry(4, '三', 'THREE', ['サン'], ['み', 'み(つ)', 'みっ(つ)'], [
    ['三つだけ', 'みっつだけ', 'just three'], ['三日', 'みっか', 'three days; third day of the month'], ['三日まで', 'みっかまで', 'by the third'], ['二、三日', 'にさんにち', 'two or three days'], ['三グラム', 'さんグラム', 'three grams'],
  ]),
  textbookEntry(5, '十', 'TEN', ['ジュウ', 'ジッ-'], ['とお', '-そ'], [
    ['二十', 'にじゅう', 'twenty'], ['二十歳', 'はたち', 'twenty years old'], ['十日', 'とおか', 'ten days; tenth day of the month'], ['二十日', 'はつか', 'twenty days; twentieth day of the month'], ['一から十まで', 'いちからじゅうまで', 'without exception'],
  ]),
  textbookEntry(6, '四', 'FOUR', ['シ'], ['よ', 'よ(つ)', 'よっ(つ)', 'よん'], [
    ['四日', 'よっか', 'four days; fourth day of the month'], ['十四日', 'じゅうよっか', 'fourteen days; fourteenth day of the month'], ['四十四', 'よんじゅうよん', 'forty-four'], ['四ミリ', 'よんミリ', 'four millimeters'],
  ]),
  textbookEntry(7, '五', 'FIVE', ['ゴ'], ['いつ', 'いつ(つ)'], [
    ['五日', 'いつか', 'five days; fifth day of the month'], ['四、五日', 'しごにち', 'four or five days'], ['五十五', 'ごじゅうご', 'fifty-five'], ['五つほど', 'いつつほど', 'around five'], ['ダイヤの五', 'ダイヤのご', 'five of diamonds'],
  ]),
  textbookEntry(8, '六', 'SIX', ['ロク'], ['む', 'む(つ)', 'むっ(つ)', 'むい'], [
    ['六日', 'むいか', 'six days; sixth day of the month'], ['六日ぶりに', 'むいかぶりに', 'for the first time in six days'], ['十六', 'じゅうろく', 'sixteen'], ['六つ', 'むっつ', 'six; six years old'], ['六トン', 'ろくトン', 'six tons'],
  ]),
  textbookEntry(9, '七', 'SEVEN', ['シチ'], ['なな', 'なな(つ)', 'なの'], [
    ['七日', 'なのか', 'seven days; seventh day of the month'], ['十七日', 'じゅうしちにち', 'seventeen days; seventeenth day of the month'], ['七十五', 'ななじゅうご', 'seventy-five'], ['七五三', 'しちごさん', 'Shichi-Go-San festival'],
  ]),
  textbookEntry(10, '八', 'EIGHT', ['ハチ'], ['や', 'や(つ)', 'やっ(つ)', 'よう'], [
    ['八日', 'ようか', 'eight days; eighth day of the month'], ['十八日', 'じゅうはちにち', 'eighteen days; eighteenth day of the month'], ['ハチユーロ', 'はちユーロ', 'eight euros'], ['一か八か', 'いちかばちか', 'all or nothing; hit or miss'],
  ]),
  textbookEntry(11, '九', 'NINE', ['キュウ', 'ク'], ['ここの', 'ここの(つ)'], [
    ['九日', 'ここのか', 'nine days; ninth day of the month'], ['九十九', 'きゅうじゅうきゅう', 'ninety-nine'], ['九九', 'くく', 'multiplication table'], ['九つ', 'ここのつ', 'nine (of something)'], ['九日から', 'ここのかから', 'starting on the ninth'],
  ]),
  textbookEntry(12, '丸', 'ROUND', ['ガン'], ['まる', 'まる(い)', 'まる(める)'], [
    ['一丸となって', 'いちがんとなって', 'as one; all together'], ['日の丸', 'ひのまる', 'Rising Sun flag'], ['丸い', 'まるい', 'round; spherical'], ['丸める', 'まるめる', 'make round; roll up'],
  ]),
  textbookEntry(13, '円', 'CIRCLE / YEN', ['エン'], ['まる(い)', 'まる'], [
    ['円い', 'まるい', 'circular; round'], ['円さ', 'まるさ', 'roundness'], ['円グラフ', 'えんグラフ', 'pie chart'], ['一円', 'いちえん', 'one yen'], ['十四円', 'じゅうよえん', 'fourteen yen'],
  ]),
  textbookEntry(14, '〇', 'ZERO / PLACEHOLDER', ['レイ'], ['ぜろ', 'まる'], [
    ['六五〇円', 'ろっぴゃくごじゅうえん', '650 yen'], ['二三〇の九四二二', 'にさんぜろのきゅうよんにに', 'telephone number 230-9422'], ['二〇六のロッカー', 'にまるろくのロッカー', 'locker number 206'], ['〇をつける', 'まるをつける', 'mark with a circle; mark as correct'], ['〇〇さん', 'まるまるさん', 'Mr. X'],
  ]),
  textbookEntry(15, '人', 'HUMAN BEING', ['ジン', 'ニン'], ['ひと'], [
    ['ロシア人', 'ロシアじん', 'a Russian'], ['一人', 'ひとり', 'one person'], ['一人二人', 'ひとりふたり', 'one or two people'], ['二十人', 'にじゅうにん', 'twenty people'], ['人々', 'ひとびと', 'people'],
  ]),
  textbookEntry(16, '百', 'HUNDRED', ['ヒャク'], [], [
    ['百日', 'ひゃくにち', 'a hundred days; a long time'], ['百人', 'ひゃくにん', 'a hundred people'], ['六百円', 'ろっぴゃくえん', '600 yen'], ['三百六十六日', 'さんびゃくろくじゅうろくにち', '366 days'],
  ]),
  textbookEntry(17, '千', 'THOUSAND', ['セン'], ['ち'], [
    ['千人', 'せんにん', 'a thousand people'], ['一千', 'いっせん', 'one thousand'], ['三千', 'さんぜん', 'three thousand'], ['八千円', 'はっせんえん', '8,000 yen'], ['千々に', 'ちぢに', 'in pieces'],
  ]),
  textbookEntry(18, '万', 'TEN THOUSAND / MYRIAD', ['マン', 'バン'], [], [
    ['万人', 'ばんにん', 'all people'], ['万一', 'まんいち', 'if by any chance'], ['一万', 'いちまん', 'ten thousand'], ['百万', 'ひゃくまん', 'one million'], ['三万円', 'さんまんえん', '30,000 yen'],
  ]),
  textbookEntry(19, '口', 'MOUTH', ['コウ', 'ク'], ['くち'], [
    ['人口', 'じんこう', 'population'], ['一口', 'ひとくち', 'a mouthful'], ['口コミ', 'くちコミ', 'word of mouth'], ['口パク', 'くちパク', 'lip sync'], ['口にする', 'くちにする', 'eat; say; speak of'],
  ]),
  textbookEntry(20, '田', 'RICE FIELD', ['デン'], ['た'], [
    ['田んぼ', 'たんぼ', 'rice field'], ['ガス田', 'ガスでん', 'gas field'], ['三田', 'みた', 'Mita (surname)'], ['田口', 'たぐち', 'Taguchi (surname)'],
  ]),
  textbookEntry(21, '目', 'EYE / ITEM / ORDER', ['モク', 'ボク'], ['め', '-め', 'ま'], [
    ['一目', 'ひとめ', 'a look; a glimpse'], ['人目', 'ひとめ', 'attention; public notice'], ['目つき', 'めつき', 'look; expression'], ['五十人目', 'ごじゅうにんめ', 'fiftieth person'], ['六日目', 'むいかめ', 'the sixth day'],
  ]),
  textbookEntry(22, '川', 'RIVER', ['セン'], ['かわ'], [
    ['ボルガ川', 'ボルガがわ', 'Volga River'], ['川べり', 'かわべり', 'riverbank'], ['川口', 'かわぐち', 'mouth of a river; Kawaguchi (surname)'], ['川田', 'かわた', 'Kawada (surname)'],
  ]),
  textbookEntry(23, '月', 'MOON / MONTH', ['ゲツ', 'ガツ'], ['つき'], [
    ['小の月', 'しょうのつき', 'month with thirty or fewer days'], ['大小', 'だいしょう', 'large and small; size'], ['小口', 'こぐち', 'small lot; small sum; end; edge'], ['小川', 'おがわ', 'brook; streamlet'], ['一月', 'いちがつ', 'January'],
  ]),
  textbookEntry(24, '明', 'BRIGHT / CHEERFUL / CLEAR', ['メイ', 'ミョウ'], ['あ(かり)', 'あ(かるい)', 'あ(きらか)', 'あ(ける)', 'あ(く)', 'あ(くる)', 'あ(す)'], [
    ['明月', 'めいげつ', 'bright moon; full moon; harvest moon'], ['明るい', 'あかるい', 'bright; light; clear; cheerful'], ['明らかな', 'あきらかな', 'clear; distinct; apparent'], ['明日', 'あす', 'tomorrow'], ['明くる日', 'あくるひ', 'the following day'],
  ]),
  textbookEntry(25, '曜', 'DAY OF THE WEEK', ['ヨウ'], [], [
    ['日曜日', 'にちようび', 'Sunday'], ['月曜日', 'げつようび', 'Monday'], ['曜日', 'ようび', 'day of the week'], ['七曜', 'しちよう', 'seven days of the week'],
  ]),
  textbookEntry(26, '火', 'FIRE', ['カ'], ['ひ', '-び', '-ほ'], [
    ['火曜日', 'かようび', 'Tuesday'], ['火口', 'かこう', 'crater'], ['口火', 'くちび', 'fuse; pilot burner; cause'], ['火田', 'かでん', 'slash-and-burn agriculture'],
  ]),
  textbookEntry(27, '水', 'WATER', ['スイ'], ['みず', '-みず'], [
    ['火水', 'ひみず', 'fire and water'], ['水口', 'みずぐち', 'spout; nozzle'], ['水田', 'すいでん', 'paddy field; rice field'], ['水曜日', 'すいようび', 'Wednesday'], ['月水', 'げっすい', 'Mondays and Wednesdays'],
  ]),
  textbookEntry(28, '木', 'TREE / WOOD', ['ボク', 'モク'], ['き', 'こ-'], [
    ['木曜日', 'もくようび', 'Thursday'], ['1月7日(木)', 'いちがつなのかもく', 'January 7 (Thursday)'], ['火木', 'かもく', 'Tuesdays and Thursdays'], ['木目', 'きめ', 'wood grain'], ['一本木', 'いちぼく', 'one tree'],
  ]),
  textbookEntry(29, '金', 'GOLD / METAL / MONEY', ['キン', 'コン'], ['かね', 'かな', '-がね'], [
    ['口金', 'くちがね', 'metal clasp; snap; metal cap'], ['金メダル', 'きんメダル', 'gold medal'], ['お金', 'おかね', 'money'], ['金曜日', 'きんようび', 'Friday'], ['月水金', 'げっすいきん', 'Mondays, Wednesdays, and Fridays'],
  ]),
  textbookEntry(30, '土', 'SOIL / LAND', ['ド', 'ト'], ['つち'], [
    ['土曜日', 'どようび', 'Saturday'], ['土日', 'どにち', 'Saturday and Sunday; weekend'], ['土木', 'どぼく', 'engineering works'], ['土人', 'どじん', 'aborigines'], ['土いじり', 'つちいじり', 'fiddling with dirt; puttering in the garden'],
  ]),
  textbookEntry(31, '本', 'BASIS / ORIGIN / ROOT / BOOK / THIS', ['ホン'], ['もと'], [
    ['本土', 'ほんど', 'mainland'], ['日本', 'にほん', 'Japan'], ['あの人の本', 'あのひとのほん', 'that person’s book'], ['本人', 'ほんにん', 'the person himself; the said person'], ['本日', 'ほんじつ', 'today; this day'],
  ]),
  textbookEntry(32, '東', 'EAST', ['トウ'], ['ひがし'], [
    ['東日本', 'ひがしにほん', 'eastern Japan'], ['東口', 'ひがしぐち', 'east exit'], ['東アジア', 'ひがしアジア', 'East Asia'], ['東チモール', 'ひがしチモール', 'East Timor'],
  ]),
  textbookEntry(33, '大', 'BIG / UNIVERSITY', ['ダイ', 'タイ'], ['おお-', 'おお(きい)', 'おお(いに)'], [
    ['大金', 'たいきん', 'large sum of money'], ['大きい', 'おおきい', 'big; grand'], ['大いに', 'おおいに', 'very; highly'], ['大人', 'おとな', 'adult'], ['東大', 'とうだい', 'University of Tokyo'],
  ]),
  textbookEntry(34, '小', 'SMALL', ['ショウ'], ['ちい(さい)', 'こ-', 'お-'], [
    ['小の月', 'しょうのつき', 'month with thirty or fewer days'], ['大小', 'だいしょう', 'large and small; size'], ['小口', 'こぐち', 'small lot; small sum; end; edge'], ['小川', 'おがわ', 'brook; streamlet'], ['小さい', 'ちいさい', 'small'],
  ]),
  textbookEntry(35, '中', 'MIDDLE / IN / CHINA', ['チュウ', 'ジュウ'], ['なか'], [
    ['中東', 'ちゅうとう', 'Middle East'], ['中ヒール', 'ちゅうヒール', 'medium-high heel'], ['中に', 'なかに', 'in; in the middle of; between; among'], ['日中', 'にっちゅう', 'during the day'], ['日中', 'にっちゅう', 'Japan and China; Japanese-Chinese'],
  ]),
  textbookEntry(36, '生', 'LIFE / GROW / BE BORN / STUDENT', ['セイ', 'ショウ'], ['い(きる)', 'い(かす)', 'い(ける)', 'う(まれる)', 'う(む)', 'お(う)', 'は(える)', 'なま'], [
    ['人生', 'じんせい', 'human life; life'], ['一生', 'いっしょう', 'a lifetime; all one’s life'], ['生ビール', 'なまビール', 'draft beer'], ['生まれる', 'うまれる', 'be born'], ['東大生', 'とうだいせい', 'student of the University of Tokyo'],
  ]),
  textbookEntry(37, '山', 'MOUNTAIN', ['サン'], ['やま'], [
    ['火山', 'かざん', 'volcano'], ['山水', 'さんすい', 'landscape'], ['山川', 'せんせん', 'mountains and rivers'], ['小山', 'こやま', 'hill'], ['山々', 'やまやま', 'mountains; very much'],
  ]),
  textbookEntry(38, '出', 'GO OUT / PUT OUT', ['シュツ', 'スイ'], ['で(る)', '-で', 'だ(す)', '-だ(す)'], [
    ['出る', 'でる', 'go out; depart; go to; be present'], ['出口', 'でぐち', 'exit'], ['日の出', 'ひので', 'sunrise'], ['出す', 'だす', 'put out; produce; expose'], ['出生', 'しゅっしょう', 'birth'],
  ]),
  textbookEntry(39, '入', 'ENTER / PUT IN', ['ニュウ'], ['い(る)', '-い(る)', '-い(り)', 'い(れる)', '-い(れ)', 'はい(る)'], [
    ['入る', 'いる', 'enter'], ['入る', 'はいる', 'enter; join; contain; have; begin'], ['入れる', 'いれる', 'put in; let in; accommodate; accept'], ['入金', 'にゅうきん', 'payment; deposit'],
  ]),
  textbookEntry(40, '下', 'DOWN / LOWER / BELOW', ['カ', 'ゲ'], ['した', 'しも', 'もと', 'さ(げる)', 'さ(がる)', 'くだ(る)', 'くだ(り)', 'くだ(す)', 'お(ろす)', 'お(りる)'], [
    ['下水', 'げすい', 'sewerage; drainage'], ['目下', 'めした', 'subordinate'], ['目下', 'もっか', 'now; at present'], ['川下', 'かわしも', 'downstream; downriver'], ['川田さんの下に', 'かわださんのもとに', 'under Ms. Kawada’s supervision'],
  ]),
  textbookEntry(41, '上', 'UP / RISE / RAISE / ABOVE', [], [], []),
  textbookEntry(42, '止', 'STOP', [], [], []),
  textbookEntry(43, '正', 'RIGHT / UPRIGHT / CORRECT / EXACT', [], [], []),
  textbookEntry(44, '足', 'FOOT / LEG / STEP / SUFFICE', [], [], []),
  textbookEntry(45, '定', 'FIX / DECIDE / SETTLE', [], [], []),
  textbookEntry(46, '手', 'HAND / ARM / LABOR / SKILL / PERFORMER OF AN ACTION', [], [], []),
  textbookEntry(47, '用', 'EMPLOY / THINGS TO DO', [], [], []),
  textbookEntry(48, '無', 'WITHOUT / NOTHING', [], [], []),
  {
    textbookId: 49,
    character: '不', keyword: 'NOT / un-', onyomi: ['フ'], kunyomi: [],
    mnemonic: 'Imagine a bird trying to fly upward but being halted: it goes… NOT.',
    vocab: [
      { word: '不用', reading: 'ふよう', meaning: 'of no use' },
      { word: '不正', reading: 'ふせい', meaning: 'injustice; wrong; illegality' },
      { word: '不足', reading: 'ふそく', meaning: 'insufficiency; want; dissatisfaction' }
    ], status: 'new'
  },
  {
    textbookId: 50,
    character: '回', keyword: 'TURN ROUND / TIME', onyomi: ['カイ', 'エ'], kunyomi: ['まわる', 'まわす'],
    mnemonic: 'Picture a wheel-like shape. Count each TIME it turns round.',
    vocab: [
      { word: '回る', reading: 'まわる', meaning: 'turn around' },
      { word: '回す', reading: 'まわす', meaning: 'turn around' },
      { word: '一回', reading: 'いっかい', meaning: 'one time; once' }
    ], status: 'new'
  },
  {
    textbookId: 51,
    character: '言', keyword: 'SAY / SPEECH / word', onyomi: ['ゲン', 'ゴン'], kunyomi: ['いう', 'こと'],
    mnemonic: 'Four horizontal lines are sound waves coming from the small mouth at the bottom: SPEECH.',
    vocab: [
      { word: '言う', reading: 'いう', meaning: 'say; speak; state; call; refer to' },
      { word: '言語', reading: 'げんご', meaning: 'language' },
      { word: '一言', reading: 'ひとこと', meaning: 'a word' }
    ], status: 'new'
  },
  {
    textbookId: 52,
    character: '舌', keyword: 'TONGUE', onyomi: ['ゼツ'], kunyomi: ['した'],
    mnemonic: 'A mouth at the bottom with a TONGUE sticking out toward the top.',
    vocab: [
      { word: '舌', reading: 'した', meaning: 'tongue' },
      { word: '舌がもつれる', reading: 'したがもつれる', meaning: 'one’s tongue gets twisted' }
    ], status: 'new'
  },
];

export function sortByTextbookOrder(items: readonly Kanji[]): Kanji[] {
  return [...items].sort((a, b) => (a.textbookId ?? Infinity) - (b.textbookId ?? Infinity));
}
