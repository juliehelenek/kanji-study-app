import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, PanResponder, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Kanji, KanjiProgress, ReviewTrack, TextbookStage, kanjiList, sortByTextbookOrder } from './data';
import kanjiStrokes from './kanjiStrokes.json';

type Point = { x: number; y: number };
type StrokeData = number[][][];
const guideData = kanjiStrokes as Record<string, StrokeData>;
const GUIDE_SIZE = 109;
const PROGRESS_STORAGE_KEY = 'kanji-study.progress.v1';
const REVIEW_INTERVALS_DAYS = [1 / 144, 1, 3, 7, 30, 90];

function newTrack(): ReviewTrack { return { intervalDays: 0, nextReviewAt: 0, successes: 0, lapses: 0 }; }
function newProgress(): KanjiProgress { return { mnemonic: newTrack(), writing: newTrack(), reading: newTrack() }; }
function withProgress(kanji: Kanji): Kanji { return { ...kanji, progress: kanji.progress ?? newProgress() }; }
function updateTrack(track: ReviewTrack, passed: boolean, hard = false): ReviewTrack {
  const successes = passed ? track.successes + 1 : 0;
  const intervalDays = passed ? REVIEW_INTERVALS_DAYS[Math.min(successes - 1, REVIEW_INTERVALS_DAYS.length - 1)] * (hard ? 0.5 : 1) : REVIEW_INTERVALS_DAYS[0];
  return { intervalDays, nextReviewAt: Date.now() + intervalDays * 86_400_000, successes, lapses: track.lapses + (passed ? 0 : 1) };
}
function isDue(kanji: Kanji, skill: keyof KanjiProgress) { return (kanji.progress?.[skill].nextReviewAt ?? 0) <= Date.now(); }

type Tab = 'overview' | 'learn' | 'practice' | 'settings';
type PracticeMode = 'write' | 'read' | 'mnemonic' | 'mixed';

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Deck' },
  { id: 'learn', label: 'Study' },
  { id: 'practice', label: 'Practice' },
  { id: 'settings', label: 'Add kanji' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [kanji, setKanji] = useState<Kanji[]>(() => kanjiList.map(withProgress));
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [selected, setSelected] = useState(0);
  const current = kanji[selected] ?? kanji[0];

  const next = () => setSelected((i) => (i + 1) % Math.max(kanji.length, 1));

  useEffect(() => {
    AsyncStorage.getItem(PROGRESS_STORAGE_KEY).then(saved => {
      if (saved) {
        const savedKanji: Kanji[] = JSON.parse(saved).map(withProgress);
        const savedByCharacter = new Map(savedKanji.map(item => [item.character, item] as const));
        const textbookCharacters = new Set(kanjiList.map(item => item.character));
        const textbookDeck = kanjiList.map(item => {
          const savedItem = savedByCharacter.get(item.character);
          return savedItem ? {
            ...item,
            ...savedItem,
            keyword: item.keyword,
            onyomi: item.onyomi,
            kunyomi: item.kunyomi,
            textbookId: item.textbookId,
          } : withProgress(item);
        });
        const customKanji = savedKanji.filter(item => !textbookCharacters.has(item.character));
        setKanji([...textbookDeck, ...customKanji]);
      }
    }).catch(() => {}).finally(() => setProgressLoaded(true));
  }, []);
  useEffect(() => {
    if (progressLoaded) AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(kanji)).catch(() => {});
  }, [kanji, progressLoaded]);

  const recordReview = (character: string, skill: keyof KanjiProgress, passed: boolean, usedLifeline = false) => {
    setKanji(items => items.map(k => {
      if (k.character !== character) return k;
      const progress = k.progress ?? newProgress();
      const track = updateTrack(progress[skill], passed, usedLifeline);
      let status = k.status;
      if (skill === 'mnemonic' && passed) status = 'unfamiliar';
      if (skill === 'writing') status = !passed ? 'unfamiliar' : k.status === 'mastered' ? 'mastered' : track.successes >= 3 ? 'familiar' : 'unfamiliar';
      if (skill === 'reading') status = !passed ? 'familiar' : k.status === 'mastered' || track.successes >= 3 ? 'mastered' : 'familiar';
      return { ...k, status, progress: { ...progress, [skill]: track } };
    }));
  };
  const recordTextbookStage = (character: string, stage: TextbookStage) => {
    setKanji(items => items.map(item => item.character === character
      ? { ...item, textbookProgress: { ...item.textbookProgress, [stage]: true } }
      : item));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Kanji Study</Text>
        <Text style={styles.subtitle}>Your personal Japanese study deck</Text>
      </View>

      <View style={styles.content}>
        {tab === 'overview' && <OverviewScreen kanji={kanji} selected={selected} setSelected={setSelected} onSaveVocabulary={(character, vocab) => setKanji(items => items.map(k => k.character === character ? { ...k, vocab } : k))} onStartStudy={() => setTab('learn')} />}
        {tab === 'learn' && <PipelineScreen kanji={kanji} onReview={recordReview} onCompleteTextbookStage={recordTextbookStage} onOpenDeck={() => setTab('overview')} onOpenPractice={() => setTab('practice')} />}
        {tab === 'practice' && <PracticeScreen kanji={kanji} current={current} selected={selected} next={next} />}
        {tab === 'settings' && <SettingsScreen onAdd={(k) => { setKanji((items) => [...items, withProgress(k)]); setSelected(kanji.length); setTab('overview'); }} />}
      </View>

      <View style={styles.navShell}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navScroll} contentContainerStyle={styles.nav}>
          {tabs.map((t) => (
            <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.navButton, tab === t.id && styles.navButtonActive]}>
              <Text style={[styles.navText, tab === t.id && styles.navTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function OverviewScreen({ kanji, selected, setSelected, onSaveVocabulary, onStartStudy }: { kanji: Kanji[]; selected: number; setSelected: (n: number) => void; onSaveVocabulary: (character: string, vocab: Kanji['vocab']) => void; onStartStudy: () => void }) {
  const [answer, setAnswer] = useState(''); const [revealed, setRevealed] = useState(false);
  useEffect(() => { setAnswer(''); setRevealed(false); }, [selected]);
  const counts = useMemo(() => ({
    new: kanji.filter(k => k.status === 'new').length,
    unfamiliar: kanji.filter(k => k.status === 'unfamiliar').length,
    familiar: kanji.filter(k => k.status === 'familiar').length,
    mastered: kanji.filter(k => k.status === 'mastered').length,
  }), [kanji]);
  const dueCount = kanji.reduce((total, card) => total + (['mnemonic', 'writing', 'reading'] as const).filter(skill => {
    const eligible = skill === 'mnemonic' ? card.status === 'new' : skill === 'writing' ? card.status === 'unfamiliar' || card.status === 'mastered' : card.status === 'familiar' || card.status === 'mastered';
    return eligible && (skill !== 'reading' || card.vocab.length > 0) && isDue(card, skill);
  }).length, 0);
  const quickAnswerCorrect = !!kanji[selected] && kanji[selected].keyword.split('/').some(keyword => answer.trim().toLocaleLowerCase() === keyword.trim().toLocaleLowerCase());
  return <ScrollView contentContainerStyle={styles.scroll}>
    <Text style={styles.h1}>Your study deck</Text>
    <View style={styles.feedback}><Text style={styles.feedbackTitle}>{dueCount ? `${dueCount} study ${dueCount === 1 ? 'item' : 'items'} ready` : 'You’re all caught up'}</Text><Text style={styles.body}>{dueCount ? 'Due reviews and new kanji are ready when you are.' : 'Keep exploring your deck, or come back when the next review is due.'}</Text><Pressable style={styles.primary} onPress={onStartStudy}><Text style={styles.primaryText}>{dueCount ? 'Start studying' : 'Open study'}</Text></Pressable></View>
    {!!kanji[selected] && <View style={styles.feedback}><Text style={styles.sectionLabel}>Quick recall</Text><Text style={styles.quizKanji}>{kanji[selected].character}</Text>{!revealed ? <TextInput style={styles.input} value={answer} onChangeText={setAnswer} placeholder="Enter one meaning" /> : <><Text style={styles.feedbackTitle}>{quickAnswerCorrect ? 'Correct!' : 'Review this meaning'}</Text><Text style={styles.body}>Answer: {kanji[selected].keyword.replaceAll(' / ', ', ')}</Text></>}
    <Pressable disabled={!revealed && !answer.trim()} style={[styles.primary, !revealed && !answer.trim() && styles.disabledButton]} onPress={() => { if (!revealed) setRevealed(true); else { setAnswer(''); setRevealed(false); setSelected((selected + 1) % kanji.length); } }}><Text style={styles.primaryText}>{revealed ? 'Next kanji' : 'Check answer'}</Text></Pressable></View>}
    <Text style={styles.sectionLabel}>Study deck</Text>
    <View style={styles.statsRow}>{Object.entries(counts).map(([k, v]) => <View style={styles.stat} key={k}><Text style={styles.statNum}>{v}</Text><Text style={styles.statLabel}>{k}</Text></View>)}</View>
    <Text style={styles.sectionLabel}>Kanji</Text>
    <View style={styles.grid}>{kanji.map((k, i) => <Pressable key={`${k.character}-${i}`} onPress={() => setSelected(i)} style={[styles.kanjiCard, i === selected && styles.kanjiCardSelected]}><Text style={styles.kanji}>{k.character}</Text><Text style={styles.keyword}>{k.keyword}</Text><Text style={styles.status}>{k.status}</Text></Pressable>)}</View>
    {kanji[selected] && <><View style={styles.detailCard}><Text style={styles.bigKanji}>{kanji[selected].character}</Text><Text style={styles.h2}>{kanji[selected].keyword}</Text><Text style={styles.body}>On-yomi: {kanji[selected].onyomi.join(' / ') || '—'}</Text><Text style={styles.body}>Kun-yomi: {kanji[selected].kunyomi.join(' / ') || '—'}</Text><Text style={styles.reading}>Current stage: {kanji[selected].status}</Text></View><VocabularyEditor key={kanji[selected].character} character={kanji[selected].character} initialVocabulary={kanji[selected].vocab} onSave={vocab => onSaveVocabulary(kanji[selected].character, vocab)} /></>}
  </ScrollView>;
}

function VocabularyEditor({ character, initialVocabulary, onSave }: { character: string; initialVocabulary: Kanji['vocab']; onSave: (vocab: Kanji['vocab']) => void }) {
  const [vocabulary, setVocabulary] = useState<Kanji['vocab']>(initialVocabulary);
  const hasIncompleteRow = vocabulary.some(item => !item.word.trim() || !item.reading.trim() || !item.meaning.trim());
  return <View style={styles.detailCard}>
    <Text style={styles.h2}>Vocabulary for {character}</Text>
    <Text style={styles.body}>Add examples here to unlock reading reviews for this kanji.</Text>
    {vocabulary.map((item, index) => <View key={`vocab-${index}`} style={styles.vocabEditorRow}>
      <TextInput style={styles.input} value={item.word} onChangeText={word => setVocabulary(rows => rows.map((row, rowIndex) => rowIndex === index ? { ...row, word } : row))} placeholder="Word, e.g. 学生" />
      <TextInput style={[styles.input, styles.vocabEditorInput]} value={item.reading} onChangeText={reading => setVocabulary(rows => rows.map((row, rowIndex) => rowIndex === index ? { ...row, reading } : row))} placeholder="Reading, e.g. がくせい" />
      <TextInput style={[styles.input, styles.vocabEditorInput]} value={item.meaning} onChangeText={meaning => setVocabulary(rows => rows.map((row, rowIndex) => rowIndex === index ? { ...row, meaning } : row))} placeholder="Meaning, e.g. student" />
      <Pressable accessibilityRole="button" onPress={() => setVocabulary(rows => rows.filter((_, rowIndex) => rowIndex !== index))}><Text style={styles.removeText}>Remove example</Text></Pressable>
    </View>)}
    <View style={styles.buttonRow}>
      <Pressable style={styles.secondaryButton} onPress={() => setVocabulary(rows => [...rows, { word: '', reading: '', meaning: '' }])}><Text style={styles.secondaryText}>Add example</Text></Pressable>
      <Pressable disabled={hasIncompleteRow} style={[styles.secondaryButton, hasIncompleteRow && styles.disabledButton]} onPress={() => onSave(vocabulary.map(item => ({ word: item.word.trim(), reading: item.reading.trim(), meaning: item.meaning.trim() })))}><Text style={styles.secondaryText}>Save vocabulary</Text></Pressable>
    </View>
    {hasIncompleteRow && <Text style={styles.reading}>Complete or remove each example before saving.</Text>}
  </View>;
}

function WriteScreen({ current, next, onReview, compact = false }: { current: Kanji; next: () => void; onReview?: (passed: boolean, usedLifeline: boolean) => void; compact?: boolean }) {
  const targetStrokes = guideData[current.character];
  const [showExample, setShowExample] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [padSize, setPadSize] = useState({ width: 0, height: 0 });
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [feedback, setFeedback] = useState('Draw the first stroke from memory in one continuous motion.');
  const [showStrokeHint, setShowStrokeHint] = useState(false);
  const [usedLifeline, setUsedLifeline] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const accepted = useRef<Point[][]>([]);
  const activeStroke = useRef<Point[]>([]);
  const padSizeRef = useRef(padSize);
  const acceptedCount = useRef(0);
  const latest = useRef({ targetStrokes, acceptedCount, accepted, setStrokes, setFeedback, setDrawing, setShowStrokeHint });
  latest.current = { targetStrokes, acceptedCount, accepted, setStrokes, setFeedback, setDrawing, setShowStrokeHint };
  const canDraw = () => !latest.current.targetStrokes || latest.current.acceptedCount.current < latest.current.targetStrokes.length;
  const toGuidePoint = (point: Point): Point => {
    const { width, height } = padSizeRef.current;
    const scale = Math.min(width, height) / GUIDE_SIZE;
    if (!scale) return { x: 0, y: 0 };
    return { x: (point.x - (width - GUIDE_SIZE * scale) / 2) / scale, y: (point.y - (height - GUIDE_SIZE * scale) / 2) / scale };
  };
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: canDraw,
    onMoveShouldSetPanResponderCapture: canDraw,
    onStartShouldSetPanResponder: canDraw,
    onMoveShouldSetPanResponder: canDraw,
    onPanResponderGrant: event => {
      if (!canDraw()) return;
      const point = toGuidePoint({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY });
      activeStroke.current = [point];
      latest.current.setDrawing(true);
      latest.current.setStrokes([...latest.current.accepted.current, activeStroke.current]);
    },
    onPanResponderMove: event => {
      const point = toGuidePoint({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY });
      const previous = activeStroke.current[activeStroke.current.length - 1];
      const dx = point.x - previous.x; const dy = point.y - previous.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0.7) {
        const steps = Math.ceil(distance / 2);
        for (let index = 1; index <= steps; index++) {
          const ratio = index / steps;
          activeStroke.current.push({ x: previous.x + dx * ratio, y: previous.y + dy * ratio });
        }
        latest.current.setStrokes([...latest.current.accepted.current, activeStroke.current]);
      }
    },
    onPanResponderRelease: () => {
      latest.current.setDrawing(false);
      const path = activeStroke.current;
      if (!path.length) return;
      const index = latest.current.acceptedCount.current;
      const targets = latest.current.targetStrokes;
      if (!targets) {
        latest.current.setFeedback('Stroke order data is not available for this character yet. You can still practice tracing it.');
        latest.current.accepted.current = [...latest.current.accepted.current, path];
        latest.current.setStrokes(latest.current.accepted.current);
        return;
      }
      if (index >= targets.length) {
        latest.current.setFeedback(`All ${targets.length} strokes are complete. Clear to practice again.`);
        return;
      }
      const expected = targets[index].map(([x, y]) => ({ x, y }));
      const score = strokeDistance(path, expected);
      if (score.forward < 0.21) {
        const completed = [...latest.current.accepted.current, path];
        latest.current.accepted.current = completed;
        latest.current.acceptedCount.current = index + 1;
        latest.current.setStrokes(completed);
        latest.current.setShowStrokeHint(false);
        latest.current.setFeedback(index + 1 === targets.length ? `Correct — all ${targets.length} strokes complete!` : `Correct stroke ${index + 1} of ${targets.length}. Now draw stroke ${index + 2}.`);
      } else {
        const reverseScore = compareStroke(path, [...expected].reverse());
        const laterMatch = targets.slice(index + 1).some(stroke => compareStroke(path, stroke.map(([x, y]) => ({ x, y }))) < 0.21);
        const reason = reverseScore < 0.21 ? 'The shape is close, but the direction is reversed.' : laterMatch ? 'That looks like a later stroke. Check the stroke order.' : 'The stroke shape or position is off.';
        latest.current.setStrokes([...latest.current.accepted.current, path]);
        latest.current.setShowStrokeHint(true);
        latest.current.setFeedback(`${reason} The hint for stroke ${index + 1} is shown now. Try again.`);
      }
      activeStroke.current = [];
    },
    onPanResponderTerminate: () => { activeStroke.current = []; latest.current.setDrawing(false); },
    onPanResponderTerminationRequest: () => false,
  }), []);
  const moveNext = (selfRatedPass?: boolean) => { const complete = targetStrokes ? acceptedCount.current >= targetStrokes.length : selfRatedPass === true; onReview?.(complete, usedLifeline); setStrokes([]); activeStroke.current = []; accepted.current = []; acceptedCount.current = 0; setFeedback('Draw the first stroke from memory in one continuous motion.'); setShowStrokeHint(false); setShowExample(false); setShowMnemonic(false); setUsedLifeline(false); next(); };
  const clear = () => { setStrokes([]); activeStroke.current = []; accepted.current = []; acceptedCount.current = 0; setShowStrokeHint(false); setFeedback('Draw the first stroke from memory in one continuous motion.'); };
  return <View style={styles.content}><ScrollView scrollEnabled={!drawing && !compact} contentContainerStyle={[styles.scroll, compact && styles.compactWritingScroll]}>
    {!compact && <><Text style={styles.h1}>Write the kanji</Text><Text style={styles.body}>Practice “{current.keyword}” stroke by stroke. Try the first stroke from memory; a hint will appear if you need it.</Text></>}
    {compact && <View style={styles.compactWritingPrompt}><Text style={styles.compactWritingKeyword}>{current.keyword}</Text></View>}
    {onReview && !targetStrokes && <View style={styles.feedback}><Text style={styles.feedbackTitle}>No stroke guide for this kanji</Text><Text style={styles.body}>You can still practice drawing it, but this attempt needs your self-rating.</Text></View>}
    <View style={[styles.drawingPad, compact && styles.compactDrawingPad, { touchAction: 'none' } as any]} onLayout={event => { const size = { width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height }; padSizeRef.current = size; setPadSize(size); }} {...panResponder.panHandlers}>
      <Svg pointerEvents="none" width={padSize.width} height={padSize.height} viewBox="0 0 109 109" style={StyleSheet.absoluteFill}>
        {targetStrokes?.map((stroke, index) => <Polyline key={`guide-${index}`} points={stroke.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={showExample ? '#d9d5cd' : acceptedCount.current >= targetStrokes.length ? '#c8d2df' : index === acceptedCount.current && showStrokeHint ? '#b7c5df' : 'transparent'} strokeWidth={showExample ? 2 : acceptedCount.current >= targetStrokes.length ? 3 : index === acceptedCount.current ? 4 : 2} strokeLinecap="round" strokeLinejoin="round" />)}
        {strokes.map((stroke, index) => <Polyline key={`ink-${index}`} points={stroke.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke={index < accepted.current.length ? '#34312d' : '#c64d43'} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />)}
      </Svg>
    </View>
    <Text style={[styles.reading, compact && styles.compactWritingStatus]}>{targetStrokes ? `${acceptedCount.current} of ${targetStrokes.length} strokes · ${feedback}` : feedback}</Text>
    {showMnemonic && <View style={styles.feedback}><Text style={styles.feedbackTitle}>Mnemonic lifeline</Text><Text style={styles.body}>{current.mnemonic}</Text></View>}
    {onReview && <Pressable style={[styles.secondaryButton, styles.lifelineButton]} onPress={() => { setUsedLifeline(true); setShowMnemonic(true); }}><Text style={styles.secondaryText}>Use mnemonic lifeline</Text></Pressable>}
  </ScrollView>
    <View style={[styles.writeFooter, compact && styles.compactWriteFooter]}>
      <View style={[styles.buttonRow, compact && styles.compactButtonRow]}><Pressable style={[styles.secondaryButton, compact && styles.compactActionButton]} onPress={clear}><Text style={styles.secondaryText}>Clear</Text></Pressable><Pressable style={[styles.secondaryButton, compact && styles.compactActionButton]} onPress={() => setShowExample(value => !value)}><Text style={styles.secondaryText}>{showExample ? 'Hide full guide' : 'Show full guide'}</Text></Pressable></View>
      {onReview && !targetStrokes ? <View style={[styles.buttonRow, compact && styles.compactButtonRow]}><Pressable style={[styles.secondaryButton, compact && styles.compactActionButton]} onPress={() => moveNext(false)}><Text style={styles.secondaryText}>Need more practice</Text></Pressable><Pressable style={[styles.primary, styles.flexButton, compact && styles.compactPrimaryButton, { marginTop: 0 }]} onPress={() => moveNext(true)}><Text style={styles.primaryText}>I knew it</Text></Pressable></View> : <Pressable style={[styles.primary, compact && styles.compactPrimaryButton, compact && { marginTop: 0 }]} onPress={() => moveNext()}><Text style={styles.primaryText}>{onReview ? 'Finish writing review' : 'Next kanji'}</Text></Pressable>}
    </View>
  </View>;
}

function compareStroke(user: Point[], target: Point[]) {
  if (user.length < 2 || target.length < 2) return Number.POSITIVE_INFINITY;
  const rows = user.length + 1; const columns = target.length + 1;
  const costs = Array.from({ length: rows }, () => Array<number>(columns).fill(Number.POSITIVE_INFINITY));
  costs[0][0] = 0;
  for (let i = 1; i < rows; i++) for (let j = 1; j < columns; j++) {
    const distance = Math.hypot(user[i - 1].x - target[j - 1].x, user[i - 1].y - target[j - 1].y);
    costs[i][j] = distance + Math.min(costs[i - 1][j], costs[i][j - 1], costs[i - 1][j - 1]);
  }
  return costs[rows - 1][columns - 1] / Math.max(user.length, target.length) / GUIDE_SIZE;
}

function strokeDistance(user: Point[], target: Point[]) {
  return { forward: compareStroke(user, target), reverse: compareStroke(user, [...target].reverse()) };
}

function ReadingsScreen({ current, kanji, selected, hideScope = false, compact = false, onAdvance }: { current: Kanji; kanji: Kanji[]; selected: number; hideScope?: boolean; compact?: boolean; onAdvance?: (passed: boolean, usedLifeline: boolean) => void }) {
  const [scope, setScope] = useState<'kanji' | 'deck'>('kanji');
  const [deckOrder, setDeckOrder] = useState<Kanji[]>([]);
  const [itemIndex, setItemIndex] = useState(0); const [reading, setReading] = useState(''); const [meaning, setMeaning] = useState(''); const [revealed, setRevealed] = useState(false);
  const [usedLifeline, setUsedLifeline] = useState(false);
  const sessionKanji = hideScope ? [current] : scope === 'deck' ? deckOrder : [current];
  const items = sessionKanji.flatMap(k => k.vocab.map(v => ({ kanji: k, vocab: v })));
  const item = items.length ? items[itemIndex % items.length] : null;
  const quizKanji = item?.kanji ?? current;
  const vocab = item?.vocab ?? null;
  const isNew = quizKanji.status === 'new'; const isUnfamiliar = quizKanji.status === 'unfamiliar';
  const answerIsCorrect = !!vocab && reading.trim() === vocab.reading && (!isFamiliarCheck(quizKanji.status) || meaning.trim().toLocaleLowerCase() === vocab.meaning.toLocaleLowerCase());
  const canCheck = isNew ? !!reading : !!reading.trim() && (isUnfamiliar || !!meaning.trim());
  const advance = () => { if (onAdvance) { onAdvance(answerIsCorrect, usedLifeline); return; } setItemIndex(i => (i + 1) % Math.max(items.length, 1)); setReading(''); setMeaning(''); setRevealed(false); };
  const changeScope = (newScope: 'kanji' | 'deck') => { setScope(newScope); if (newScope === 'deck') setDeckOrder(shuffled(kanji)); setItemIndex(0); setReading(''); setMeaning(''); setRevealed(false); };
  const options = useMemo(() => {
    if (!vocab) return [];
    const distractors = shuffled([...new Set([
      ...quizKanji.vocab.map(v => v.reading), ...quizKanji.onyomi, ...quizKanji.kunyomi,
      ...kanji.flatMap(card => [...card.vocab.map(v => v.reading), ...card.onyomi, ...card.kunyomi]),
    ].filter(option => option.trim() && option !== vocab.reading))]).slice(0, 3);
    return shuffled([vocab.reading, ...distractors]);
  }, [vocab?.reading, quizKanji.character, kanji]);
  const type = vocab && quizKanji.kunyomi.some(r => vocab.reading.includes(r)) ? 'Kun-yomi' : 'On-yomi';
  return <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, compact && styles.compactReading]}>
    {!compact && <Text style={styles.h1}>Vocabulary readings</Text>}
    {!hideScope && <>{!compact && <Text style={styles.sectionLabel}>Study scope</Text>}<View style={[styles.scopeRow, compact && styles.compactScopeRow]}><Pressable style={[styles.scopeButton, compact && styles.compactScopeButton, scope === 'kanji' && styles.scopeButtonActive]} onPress={() => changeScope('kanji')}><Text style={[styles.scopeText, compact && styles.compactScopeText, scope === 'kanji' && styles.scopeTextActive]}>Selected kanji</Text></Pressable><Pressable style={[styles.scopeButton, compact && styles.compactScopeButton, scope === 'deck' && styles.scopeButtonActive]} onPress={() => changeScope('deck')}><Text style={[styles.scopeText, compact && styles.compactScopeText, scope === 'deck' && styles.scopeTextActive]}>Entire deck ({kanji.length})</Text></Pressable></View></>}
    <Text style={styles.body}>{isNew ? 'Choose the correct reading.' : isUnfamiliar ? 'Use the English meaning as a clue and enter the reading.' : 'Enter the reading and English meaning.'}</Text>
    {vocab ? <><Text style={compact ? styles.compactReadingWord : styles.quizKanji}>{vocab.word}</Text>
      {isUnfamiliar && <Text style={styles.meaningClue}>Meaning: {vocab.meaning}</Text>}
      {!revealed && (isNew ? options.map(option => <Pressable key={option} style={[styles.answerOption, compact && styles.compactAnswerOption, reading === option && styles.answerOptionSelected]} onPress={() => setReading(option)}><Text style={styles.body}>{option}</Text></Pressable>) : <><TextInput style={styles.input} value={reading} onChangeText={setReading} placeholder="Reading (ひらがな)" keyboardType="default" autoCapitalize="none" autoCorrect={false} spellCheck={false}/>{!isUnfamiliar && <TextInput style={[styles.input, { marginTop: 10 }]} value={meaning} onChangeText={setMeaning} placeholder="English meaning" autoCapitalize="none"/>}</>)}
      {revealed && <View style={styles.feedback}><Text style={styles.feedbackTitle}>{reading.trim() === vocab.reading ? 'Reading correct!' : `Reading incorrect — ${vocab.reading}`} {isFamiliarCheck(quizKanji.status) && (meaning.trim().toLocaleLowerCase() === vocab.meaning.toLocaleLowerCase() ? 'Meaning correct!' : `Meaning: ${vocab.meaning}`)}</Text><Text style={styles.body}>Kanji: {quizKanji.character} — {quizKanji.keyword}</Text><Text style={styles.body}>Reading: {vocab.reading} ({type})</Text><Text style={styles.body}>Meaning: {vocab.meaning}</Text><Text style={styles.body}>On-yomi: {quizKanji.onyomi.join(' / ') || '—'}</Text><Text style={styles.body}>Kun-yomi: {quizKanji.kunyomi.join(' / ') || '—'}</Text></View>}
      {onAdvance && <Pressable style={styles.secondaryButton} onPress={() => setUsedLifeline(true)}><Text style={styles.secondaryText}>{usedLifeline ? 'Mnemonic lifeline used' : 'Use mnemonic lifeline'}</Text></Pressable>}
      {usedLifeline && <View style={styles.feedback}><Text style={styles.feedbackTitle}>Mnemonic lifeline</Text><Text style={styles.body}>{quizKanji.mnemonic}</Text></View>}
      <Text style={styles.reading}>Vocabulary {itemIndex + 1} of {items.length}{scope === 'deck' ? ` · ${quizKanji.character}` : ''}</Text>
    </> : <View style={styles.feedback}><Text style={styles.body}>No example vocabulary yet. Add vocabulary to this kanji to practice readings.</Text></View>}
  </ScrollView>
    {vocab ? <View style={styles.writeFooter}><Pressable disabled={!revealed && !canCheck} style={[styles.primary, { marginTop: 0 }, !revealed && !canCheck && styles.disabledButton]} onPress={revealed ? advance : () => setRevealed(true)}><Text style={styles.primaryText}>{revealed ? (onAdvance ? 'Next review' : 'Next vocabulary') : 'Check answer'}</Text></Pressable></View> : onAdvance ? <View style={styles.writeFooter}><Pressable style={[styles.primary, { marginTop: 0 }]} onPress={() => onAdvance(false, false)}><Text style={styles.primaryText}>Next review</Text></Pressable></View> : null}
  </KeyboardAvoidingView>;
}

function isFamiliarCheck(status: Kanji['status']) { return status === 'familiar' || status === 'mastered'; }

function MnemonicScreen({ current, kanji, fixedPrompt, hideProgress = false, compact = false, onAdvance, studyMode = false, onReview }: { current: Kanji; kanji: Kanji[]; fixedPrompt?: Kanji; hideProgress?: boolean; compact?: boolean; onAdvance?: () => void; studyMode?: boolean; onReview?: (character: string, skill: keyof KanjiProgress, passed: boolean) => void }) {
  const deckOrder = useMemo(() => shuffled(kanji), [kanji]);
  const [itemIndex, setItemIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const items = fixedPrompt ? [fixedPrompt] : deckOrder;
  const prompt = items[itemIndex % Math.max(items.length, 1)] ?? current;
  const options = useMemo(() => {
    const distractors = shuffled(kanji.filter(k => k.character !== prompt.character)).slice(0, 3);
    return shuffled([prompt, ...distractors]);
  }, [kanji, prompt]);
  const advance = () => { if (onAdvance) { onAdvance(); return; } setItemIndex(i => (i + 1) % Math.max(items.length, 1)); setAnswer(''); setRevealed(false); };
  if (!items.length) return <ScrollView contentContainerStyle={styles.scroll}><Text style={styles.h1}>Kanji mnemonics</Text><Text style={styles.body}>No new kanji are waiting for mnemonic study.</Text></ScrollView>;
  if (studyMode) {
    const recalledMeaning = prompt.keyword.split('/').some(keyword => answer.trim().toLocaleLowerCase() === keyword.trim().toLocaleLowerCase());
    return <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.h1}>Learn a new kanji</Text>
      <Text style={styles.body}>Look at the kanji and try to recall its meaning before revealing the answer.</Text>
      <Text style={styles.quizKanji}>{prompt.character}</Text>
      {!revealed ? <>
        <TextInput style={styles.input} value={answer} onChangeText={setAnswer} placeholder="Meaning from memory" autoCapitalize="none" returnKeyType="done" blurOnSubmit onSubmitEditing={() => { if (answer.trim()) setRevealed(true); }} />
        <Pressable disabled={!answer.trim()} style={[styles.primary, !answer.trim() && styles.disabledButton]} onPress={() => setRevealed(true)}><Text style={styles.primaryText}>Reveal meaning</Text></Pressable>
      </> : <>
        <View style={styles.feedback}><Text style={styles.feedbackTitle}>{recalledMeaning ? 'You recalled the meaning.' : `Meaning: ${prompt.keyword}`}</Text><Text style={styles.h2}>{prompt.keyword}</Text><Text style={styles.sectionLabel}>Mnemonic</Text><Text style={styles.body}>{prompt.mnemonic}</Text></View>
        <Text style={styles.body}>How well did you remember it?</Text>
        <View style={styles.buttonRow}>
          <Pressable style={[styles.secondaryButton, styles.flexButton]} onPress={() => { onReview?.(prompt.character, 'mnemonic', false); advance(); }}><Text style={styles.secondaryText}>Still learning</Text></Pressable>
          <Pressable style={[styles.primary, styles.flexButton, { marginTop: 0, paddingVertical: 12 }]} onPress={() => { onReview?.(prompt.character, 'mnemonic', true); advance(); }}><Text style={styles.primaryText}>Remembered</Text></Pressable>
        </View>
      </>}
      <Text style={styles.reading}>Kanji {itemIndex + 1} of {items.length}</Text>
    </ScrollView>;
  }
  return <ScrollView scrollEnabled={!compact} contentContainerStyle={[styles.scroll, compact && styles.compactRecallScroll]}>
    {!compact && <><Text style={styles.h1}>Recall the kanji</Text><Text style={styles.body}>Which kanji matches this keyword?</Text></>}
    <Text style={styles.h2}>{prompt.keyword}</Text>
    {!revealed && options.map(option => <Pressable key={option.character} style={[styles.answerOption, compact && styles.compactAnswerOption, answer === option.character && styles.answerOptionSelected]} onPress={() => setAnswer(option.character)}><Text style={[styles.answerKanji, compact && styles.compactAnswerKanji]}>{option.character}</Text></Pressable>)}
    {!compact && !revealed && !answer && <Text style={styles.reading}>Choose a kanji to check your answer.</Text>}
    {revealed ? <View style={styles.feedback}><Text style={styles.feedbackTitle}>{answer === prompt.character ? 'Correct!' : `Not quite — the answer is ${prompt.character}.`}</Text><Text style={styles.quizKanji}>{prompt.character}</Text><Text style={styles.sectionLabel}>Mnemonic</Text><Text style={styles.body}>{prompt.mnemonic}</Text></View> : null}
    <Pressable disabled={!revealed && !answer} style={[styles.primary, compact && styles.compactPrimaryButton, !revealed && !answer && styles.disabledButton]} onPress={revealed ? advance : () => setRevealed(true)}><Text style={styles.primaryText}>{revealed ? (onAdvance ? 'Next review' : 'Next kanji') : 'Check answer'}</Text></Pressable>
    {!hideProgress && <Text style={styles.reading}>Kanji {itemIndex + 1} of {items.length}</Text>}
  </ScrollView>;
}

const TEXTBOOK_BATCH_SIZE = 8;

function orderedTextbookKanji(kanji: Kanji[]) {
  return sortByTextbookOrder(kanji.filter(card => card.textbookId !== undefined));
}

function textbookStagesFor(card: Kanji): TextbookStage[] {
  return [
    'mnemonic', 'meaning', 'writing',
    ...(card.onyomi.length || card.kunyomi.length ? ['reading' as const] : []),
    ...(card.vocab.length ? ['vocabulary' as const] : []),
    'recall',
  ];
}

function isTextbookCardComplete(card: Kanji) {
  return textbookStagesFor(card).every(stage => card.textbookProgress?.[stage]);
}

function firstIncompleteTextbookIndex(kanji: Kanji[]) {
  const ordered = orderedTextbookKanji(kanji);
  const incompleteIndex = ordered.findIndex(card => !isTextbookCardComplete(card));
  return incompleteIndex < 0 ? ordered.length : Math.floor(incompleteIndex / TEXTBOOK_BATCH_SIZE) * TEXTBOOK_BATCH_SIZE;
}

function PipelineScreen({ kanji, onReview, onCompleteTextbookStage, onOpenDeck, onOpenPractice }: { kanji: Kanji[]; onReview: (character: string, skill: keyof KanjiProgress, passed: boolean, usedLifeline?: boolean) => void; onCompleteTextbookStage: (character: string, stage: TextbookStage) => void; onOpenDeck: () => void; onOpenPractice: () => void }) {
  type LearnSkill = 'mnemonic' | 'writing' | 'reading';
  type QueueItem = { skill: LearnSkill; card: Kanji };
  const [session, setSession] = useState<{ label: 'reviews' | 'new'; items: QueueItem[] }>();
  const [sessionIndex, setSessionIndex] = useState(0);
  const [textbookMode, setTextbookMode] = useState(false);
  const dueReviews: QueueItem[] = [
    ...kanji.filter(k => k.status === 'new' && ((k.progress?.mnemonic.successes ?? 0) > 0 || (k.progress?.mnemonic.lapses ?? 0) > 0) && isDue(k, 'mnemonic')).map(card => ({ skill: 'mnemonic' as const, card })),
    ...kanji.filter(k => (k.status === 'unfamiliar' || k.status === 'mastered') && isDue(k, 'writing')).map(card => ({ skill: 'writing' as const, card })),
    ...kanji.filter(k => (k.status === 'familiar' || k.status === 'mastered') && k.vocab.length > 0 && isDue(k, 'reading')).map(card => ({ skill: 'reading' as const, card })),
  ].sort((a, b) => (a.card.progress?.[a.skill].nextReviewAt ?? 0) - (b.card.progress?.[b.skill].nextReviewAt ?? 0));
  const newKanji = kanji.filter(k => k.status === 'new' && (k.progress?.mnemonic.successes ?? 0) === 0 && (k.progress?.mnemonic.lapses ?? 0) === 0 && isDue(k, 'mnemonic'));
  const startSession = (label: 'reviews' | 'new', items: QueueItem[]) => { setSession({ label, items }); setSessionIndex(0); };
  const advanceSession = (passed: boolean, usedLifeline = false) => {
    const item = session?.items[sessionIndex];
    if (!item) return;
    onReview(item.card.character, item.skill, passed, usedLifeline);
    setSessionIndex(index => index + 1);
  };
  if (textbookMode) return <TextbookSequenceScreen kanji={kanji} onReview={onReview} onCompleteStage={onCompleteTextbookStage} onExit={() => setTextbookMode(false)} />;
  const prompt = session?.items[sessionIndex];
  if (session && !prompt) return <ScrollView contentContainerStyle={styles.scroll}>
    <Text style={styles.h1}>Session complete</Text>
    <Text style={styles.body}>You finished {session.items.length} {session.label === 'new' ? 'new kanji' : 'due reviews'}.</Text>
    <Pressable style={styles.primary} onPress={() => { setSession(undefined); setSessionIndex(0); }}><Text style={styles.primaryText}>Back to study queues</Text></Pressable>
  </ScrollView>;
  if (session && prompt?.skill === 'mnemonic') return <View style={styles.content}><View style={styles.mixedHeader}><Text style={styles.reading}>{session.label === 'new' ? 'New kanji' : 'Due review'} · {sessionIndex + 1} of {session.items.length}</Text></View><MnemonicScreen key={`${session.label}-mnemonic-${prompt.card.character}`} current={prompt.card} kanji={[prompt.card]} studyMode onReview={(_, _skill, passed) => advanceSession(passed)} /></View>;
  if (session && prompt?.skill === 'writing') return <View style={styles.content}><View style={styles.mixedHeader}><Text style={styles.reading}>Due review · Writing · {sessionIndex + 1} of {session.items.length}</Text></View><WriteScreen key={`write-${prompt.card.character}`} current={prompt.card} next={() => {}} onReview={(passed, usedLifeline) => advanceSession(passed, usedLifeline)} /></View>;
  if (session && prompt?.skill === 'reading') return <View style={styles.content}><View style={styles.mixedHeader}><Text style={styles.reading}>Due review · Reading · {sessionIndex + 1} of {session.items.length}</Text></View><ReadingsScreen key={`read-${prompt.card.character}`} current={prompt.card} kanji={kanji} selected={0} hideScope onAdvance={(passed, usedLifeline) => advanceSession(passed, usedLifeline)} /></View>;
  const blockedReadingCards = kanji.filter(k => (k.status === 'familiar' || k.status === 'mastered') && k.vocab.length === 0);
  const now = Date.now();
  const upcoming = kanji.flatMap(card => {
    const skills: (keyof KanjiProgress)[] = card.status === 'new' ? ['mnemonic'] : card.status === 'unfamiliar' ? ['writing'] : card.status === 'familiar' ? (card.vocab.length ? ['reading'] : []) : card.vocab.length ? ['writing', 'reading'] : ['writing'];
    return skills.map(skill => card.progress?.[skill].nextReviewAt ?? 0).filter(at => at > now);
  });
  const nextReviewAt = upcoming.length ? Math.min(...upcoming) : undefined;
  const orderedTextbook = orderedTextbookKanji(kanji);
  const textbookStart = firstIncompleteTextbookIndex(kanji);
  const textbookBatch = orderedTextbook.slice(textbookStart, textbookStart + TEXTBOOK_BATCH_SIZE);
  const textbookBatchNumber = Math.floor(textbookStart / TEXTBOOK_BATCH_SIZE) + 1;
  const textbookLabel = textbookBatch.length
    ? `Batch ${textbookBatchNumber} · kanji ${textbookBatch[0].textbookId}–${textbookBatch[textbookBatch.length - 1].textbookId}`
    : 'All textbook batches complete';
  return <ScrollView contentContainerStyle={styles.scroll}><Text style={styles.h1}>Study</Text><Text style={styles.body}>Choose what you want to work on. Each session shows its queue and moves through the items in order.</Text>
    <View style={styles.feedback}><Text style={styles.feedbackTitle}>Textbook order · {textbookLabel}</Text><Text style={styles.body}>{textbookBatch.length ? 'Learn the next group of up to eight in textbook order: mnemonic, meaning, writing, readings, vocabulary, and recall.' : 'You have completed a first pass through the textbook sequence. You can still review it in order.'}</Text><Pressable style={styles.primary} onPress={() => setTextbookMode(true)}><Text style={styles.primaryText}>{textbookBatch.length ? 'Start textbook batch' : 'Review textbook sequence'}</Text></Pressable></View>
    <View style={styles.feedback}><Text style={styles.feedbackTitle}>Due reviews · {dueReviews.length}</Text><Text style={styles.body}>{dueReviews.length ? 'Review kanji ready for mnemonic, writing, or reading practice.' : nextReviewAt ? `Nothing due yet. Next review: ${new Date(nextReviewAt).toLocaleString()}.` : 'No reviews are due right now.'}</Text><Pressable disabled={!dueReviews.length} style={[styles.primary, !dueReviews.length && styles.disabledButton]} onPress={() => startSession('reviews', shuffled(dueReviews))}><Text style={styles.primaryText}>Start due reviews{dueReviews.length ? ` (${dueReviews.length})` : ''}</Text></Pressable></View>
    <View style={styles.feedback}><Text style={styles.feedbackTitle}>New kanji · {newKanji.length}</Text><Text style={styles.body}>Try to recall each meaning before revealing its answer and mnemonic.</Text><Pressable disabled={!newKanji.length} style={[styles.primary, !newKanji.length && styles.disabledButton]} onPress={() => startSession('new', newKanji.map(card => ({ skill: 'mnemonic', card })))}><Text style={styles.primaryText}>Learn new kanji{newKanji.length ? ` (${newKanji.length})` : ''}</Text></Pressable></View>
    {blockedReadingCards.length > 0 && <View style={styles.feedback}><Text style={styles.feedbackTitle}>Reading reviews waiting for examples</Text><Text style={styles.body}>{blockedReadingCards.map(k => k.character).join('、')} {blockedReadingCards.length === 1 ? 'needs' : 'need'} vocabulary before reading practice can be scheduled. Add examples from the Deck tab.</Text><Pressable style={styles.secondaryButton} onPress={onOpenDeck}><Text style={styles.secondaryText}>Open deck</Text></Pressable></View>}
    <Text style={styles.sectionLabel}>Keep practicing</Text><Text style={styles.body}>Choose a writing, reading, recall, or mixed practice session, or browse your kanji deck.</Text><Pressable style={styles.primary} onPress={onOpenPractice}><Text style={styles.primaryText}>Choose practice mode</Text></Pressable></ScrollView>;
}

function TextbookSequenceScreen({ kanji, onReview, onCompleteStage, onExit }: { kanji: Kanji[]; onReview: (character: string, skill: keyof KanjiProgress, passed: boolean, usedLifeline?: boolean) => void; onCompleteStage: (character: string, stage: TextbookStage) => void; onExit: () => void }) {
  type ReadingQuestion = { value: string; kind: 'On-yomi' | 'Kun-yomi' };
  type PhaseItem = { card: Kanji; reading?: ReadingQuestion; vocab?: Kanji['vocab'][number] };
  const ordered = useMemo(() => orderedTextbookKanji(kanji), [kanji]);
  const [batchStart, setBatchStart] = useState(() => firstIncompleteTextbookIndex(kanji));
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const batch = ordered.slice(batchStart, batchStart + TEXTBOOK_BATCH_SIZE);
  const phases: TextbookStage[] = [
    'mnemonic', 'meaning', 'writing',
    ...(batch.some(card => card.onyomi.length || card.kunyomi.length) ? ['reading' as const] : []),
    ...(batch.some(card => card.vocab.length) ? ['vocabulary' as const] : []),
    'recall',
  ];
  const phase = phases[phaseIndex];
  const phaseItems: PhaseItem[] = phase === 'reading'
    ? batch.flatMap(card => [
      ...card.onyomi.map(value => ({ card, reading: { value, kind: 'On-yomi' as const } })),
      ...card.kunyomi.map(value => ({ card, reading: { value, kind: 'Kun-yomi' as const } })),
    ])
    : phase === 'vocabulary'
      ? batch.flatMap(card => card.vocab.map(vocab => ({ card, vocab })))
      : batch.map(card => ({ card }));
  const currentItem = phaseItems[itemIndex];
  const current = currentItem?.card;
  const isComplete = phaseIndex >= phases.length;
  const batchNumber = Math.floor(batchStart / TEXTBOOK_BATCH_SIZE) + 1;
  const phaseNames: Record<TextbookStage, string> = {
    mnemonic: 'Learn the mnemonic', meaning: 'Meaning check', writing: 'Write the kanji',
    reading: 'Reading check', vocabulary: 'Vocabulary check', recall: 'Recall the kanji',
  };
  const [stageResults, setStageResults] = useState<Record<number, boolean>>({});

  const advance = (passed = true, usedLifeline = false) => {
    if (!current || !phase) return;
    const textbookId = current.textbookId ?? -1;
    const accumulatedPassed = (stageResults[textbookId] ?? true) && passed;
    const nextItem = phaseItems[itemIndex + 1];
    const finishingCard = !nextItem || nextItem.card.textbookId !== current.textbookId;
    if (finishingCard) {
      onCompleteStage(current.character, phase);
      if (phase === 'meaning') onReview(current.character, 'mnemonic', accumulatedPassed);
      if (phase === 'writing') onReview(current.character, 'writing', accumulatedPassed, usedLifeline);
      if (phase === 'reading') onReview(current.character, 'reading', accumulatedPassed, usedLifeline);
      setStageResults(previous => { const result = { ...previous }; delete result[textbookId]; return result; });
    } else {
      setStageResults(previous => ({ ...previous, [textbookId]: accumulatedPassed }));
    }
    if (itemIndex + 1 < phaseItems.length) setItemIndex(index => index + 1);
    else { setItemIndex(0); setPhaseIndex(index => index + 1); }
  };

  const startNextBatch = () => {
    const nextStart = firstIncompleteTextbookIndex(kanji);
    setBatchStart(nextStart < ordered.length ? nextStart : 0);
    setPhaseIndex(0);
    setItemIndex(0);
  };

  if (isComplete || !batch.length) return <ScrollView contentContainerStyle={styles.scroll}>
    <Text style={styles.h1}>{batch.length ? `Batch ${batchNumber} complete` : 'Textbook sequence complete'}</Text>
    <Text style={styles.body}>{batch.length ? `You finished the first pass for kanji ${batch[0].textbookId}–${batch[batch.length - 1].textbookId}.` : `You have completed a first pass through all ${ordered.length} textbook kanji.`}</Text>
    <Pressable style={styles.primary} onPress={startNextBatch}><Text style={styles.primaryText}>{firstIncompleteTextbookIndex(kanji) < ordered.length ? 'Continue to next batch' : 'Review the first batch'}</Text></Pressable>
    <Pressable style={styles.secondaryButton} onPress={onExit}><Text style={styles.secondaryText}>Back to study</Text></Pressable>
  </ScrollView>;

  if (!current || !phase || !currentItem) return null;
  return <View style={styles.content}>
    <View style={styles.mixedHeader}>
      <Text style={styles.reading}>Textbook batch {batchNumber} · kanji {current.textbookId} · {phaseNames[phase]} · {itemIndex + 1} of {phaseItems.length}</Text>
      <Pressable onPress={onExit}><Text style={styles.removeText}>Exit sequence</Text></Pressable>
    </View>
    {phase === 'mnemonic' ? <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.h1}>Learn the mnemonic</Text>
      <Text style={styles.body}>Take a moment to connect the character with its meaning.</Text>
      <Text style={styles.quizKanji}>{current.character}</Text>
      <Text style={styles.h2}>{current.keyword}</Text>
      <View style={styles.mnemonicCard}><Text style={styles.body}>{current.mnemonic}</Text></View>
      <Pressable style={styles.primary} onPress={() => advance()}><Text style={styles.primaryText}>Got it · practice the meaning</Text></Pressable>
    </ScrollView> : null}
    {phase === 'meaning' || phase === 'reading' || phase === 'vocabulary' || phase === 'recall'
      ? <TextbookQuizScreen key={`${phase}-${current.textbookId}-${itemIndex}`} kind={phase} current={current} kanji={kanji} readingItem={currentItem.reading} vocabItem={currentItem.vocab} onAnswer={advance} />
      : null}
    {phase === 'writing' && <WriteScreen key={`textbook-write-${current.character}`} current={current} next={() => {}} onReview={(passed, usedLifeline) => advance(passed, usedLifeline)} />}
  </View>;
}

function TextbookQuizScreen({ kind, current, kanji, readingItem, vocabItem, onAnswer }: { kind: 'meaning' | 'reading' | 'vocabulary' | 'recall'; current: Kanji; kanji: Kanji[]; readingItem?: { value: string; kind: 'On-yomi' | 'Kun-yomi' }; vocabItem?: Kanji['vocab'][number]; onAnswer: (passed: boolean) => void }) {
  const [selected, setSelected] = useState('');
  const [revealed, setRevealed] = useState(false);
  const correctAnswer = kind === 'meaning' ? current.keyword
    : kind === 'reading' ? readingItem?.value ?? ''
      : kind === 'vocabulary' ? vocabItem?.meaning ?? '' : current.character;
  const prompt = kind === 'meaning' ? 'What does this kanji mean?'
    : kind === 'reading' ? `Which ${readingItem?.kind.toLowerCase() ?? ''} reading belongs to this kanji?`
      : kind === 'vocabulary' ? 'Choose the meaning of this vocabulary word.'
        : 'Which kanji matches this meaning?';
  const stimulus = kind === 'meaning' || kind === 'reading' ? current.character
    : kind === 'vocabulary' ? vocabItem?.word ?? '' : current.keyword;
  const options = useMemo(() => {
    const distractors = kanji.flatMap(card => kind === 'meaning' ? [card.keyword]
      : kind === 'reading' ? [...card.onyomi, ...card.kunyomi]
        : kind === 'vocabulary' ? card.vocab.map(item => item.meaning) : [card.character]);
    const uniqueDistractors = Array.from(new Set(distractors.filter(answer => answer && answer !== correctAnswer)));
    return shuffled([correctAnswer, ...shuffled(uniqueDistractors).slice(0, 3)]);
  }, [correctAnswer, kanji, kind]);
  const isCorrect = selected === correctAnswer;

  return <ScrollView contentContainerStyle={styles.scroll}>
    <Text style={styles.h1}>{prompt}</Text>
    <Text style={styles.quizKanji}>{stimulus}</Text>
    {kind === 'vocabulary' && vocabItem?.reading ? <Text style={styles.reading}>{vocabItem.reading}</Text> : null}
    {!revealed && options.map(option => <Pressable key={option} style={[styles.answerOption, selected === option && styles.answerOptionSelected]} onPress={() => setSelected(option)}><Text style={[styles.keyword, kind === 'recall' && styles.answerKanji]}>{option}</Text></Pressable>)}
    {revealed && <View style={styles.feedback}>
      <Text style={styles.feedbackTitle}>{isCorrect ? 'Correct!' : `Not quite · ${correctAnswer}`}</Text>
      {kind === 'meaning' && <Text style={styles.body}>{current.mnemonic}</Text>}
    </View>}
    <Pressable disabled={!revealed && !selected} style={[styles.primary, !revealed && !selected && styles.disabledButton]} onPress={revealed ? () => onAnswer(isCorrect) : () => setRevealed(true)}><Text style={styles.primaryText}>{revealed ? 'Continue' : 'Check answer'}</Text></Pressable>
  </ScrollView>;
}

type ReviewMode = 'write' | 'read' | 'mnemonic';

function PracticeScreen({ kanji, current, selected, next }: { kanji: Kanji[]; current: Kanji; selected: number; next: () => void }) {
  const [mode, setMode] = useState<PracticeMode>('write');
  const modes: { id: PracticeMode; label: string }[] = [
    { id: 'write', label: 'Writing' },
    { id: 'read', label: 'Readings' },
    { id: 'mnemonic', label: 'Recall' },
    { id: 'mixed', label: 'Mixed' },
  ];
  return <View style={styles.content}>
    <View style={styles.practiceHeader}><View style={styles.practiceModeRow}>{modes.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.label} practice`} accessibilityState={{ selected: mode === item.id }} style={[styles.practiceModeButton, mode === item.id && styles.scopeButtonActive]} onPress={() => setMode(item.id)}><Text style={[styles.practiceModeText, mode === item.id && styles.scopeTextActive]}>{item.label}</Text></Pressable>)}</View></View>
    <View style={styles.content}>
      {mode === 'write' && <WriteScreen current={current} next={next} />}
      {mode === 'read' && <ReadingsScreen current={current} kanji={kanji} selected={selected} compact />}
      {mode === 'mnemonic' && <MnemonicScreen current={current} kanji={kanji} />}
      {mode === 'mixed' && <MixedReviewScreen kanji={kanji} />}
    </View>
  </View>;
}

function MixedReviewScreen({ kanji, onReview }: { kanji: Kanji[]; onReview?: (character: string, skill: keyof KanjiProgress, passed: boolean, usedLifeline?: boolean) => void }) {
  const deckOrder = useMemo(() => shuffled(kanji), [kanji]);
  const readingCards = deckOrder.filter(card => card.vocab.length > 0);
  const [modes] = useState<ReviewMode[]>(() => shuffled<ReviewMode>(onReview ? (readingCards.length ? ['write', 'read'] : ['write']) : (readingCards.length ? ['write', 'read', 'mnemonic'] : ['write', 'mnemonic'])));
  const [sessionIndex, setSessionIndex] = useState(0);
  const mode = modes[sessionIndex % modes.length];
  const prompt = mode === 'read' && readingCards.length
    ? readingCards[Math.floor(sessionIndex / modes.length) % readingCards.length]
    : deckOrder[sessionIndex % Math.max(deckOrder.length, 1)] ?? kanji[0];
  const advance = () => setSessionIndex(index => index + 1);

  if (!prompt) return <ScrollView contentContainerStyle={styles.scroll}><Text style={styles.h1}>Mixed review</Text><Text style={styles.body}>Add kanji to begin a mixed review session.</Text></ScrollView>;

  return <View style={styles.content}>
    <View style={styles.mixedCompactHeader}><Text style={styles.mixedCompactTitle}>Mixed · {mode === 'write' ? 'Writing' : mode === 'read' ? 'Readings' : 'Recall'}</Text><Text style={styles.mixedCompactProgress}>{onReview ? 'Mastered · ' : ''}Kanji {(sessionIndex % deckOrder.length) + 1} of {deckOrder.length}</Text></View>
    {mode === 'write' && <WriteScreen key={`write-${sessionIndex}`} current={prompt} next={advance} compact />}
    {mode === 'read' && <ReadingsScreen key={`read-${sessionIndex}`} current={prompt} kanji={kanji} selected={0} hideScope compact onAdvance={(passed, usedLifeline) => { onReview?.(prompt.character, 'reading', passed, usedLifeline); advance(); }} />}
    {mode === 'mnemonic' && <MnemonicScreen key={`mnemonic-${sessionIndex}`} current={prompt} kanji={kanji} fixedPrompt={prompt} hideProgress compact onAdvance={advance} />}
  </View>;
}

function SettingsScreen({ onAdd }: { onAdd: (k: Kanji) => void }) {
  const [character, setCharacter] = useState(''); const [keyword, setKeyword] = useState(''); const [mnemonic, setMnemonic] = useState(''); const [on, setOn] = useState(''); const [kun, setKun] = useState('');
  const [vocabWord, setVocabWord] = useState(''); const [vocabReading, setVocabReading] = useState(''); const [vocabMeaning, setVocabMeaning] = useState('');
  const add = () => { if (!character.trim()) return; const vocab = vocabWord.trim() && vocabReading.trim() && vocabMeaning.trim() ? [{ word: vocabWord.trim(), reading: vocabReading.trim(), meaning: vocabMeaning.trim() }] : []; onAdd({ character: character.trim(), keyword: keyword.trim() || 'New kanji', mnemonic: mnemonic.trim() || 'Add a mnemonic later.', onyomi: on.split(/[,/ ]+/).filter(Boolean), kunyomi: kun.split(/[,/ ]+/).filter(Boolean), vocab, status: 'new' }); setCharacter(''); setKeyword(''); setMnemonic(''); setOn(''); setKun(''); setVocabWord(''); setVocabReading(''); setVocabMeaning(''); };
  return <ScrollView contentContainerStyle={styles.scroll}><Text style={styles.h1}>Add kanji</Text><Text style={styles.body}>Your learning progress and review schedule are saved on this device.</Text><Text style={styles.sectionLabel}>Character</Text><TextInput style={styles.input} value={character} onChangeText={setCharacter} placeholder="例: 学"/><Text style={styles.sectionLabel}>Keyword</Text><TextInput style={styles.input} value={keyword} onChangeText={setKeyword} placeholder="example: LEARN"/><Text style={styles.sectionLabel}>On-yomi</Text><TextInput style={styles.input} value={on} onChangeText={setOn} placeholder="ガク"/><Text style={styles.sectionLabel}>Kun-yomi</Text><TextInput style={styles.input} value={kun} onChangeText={setKun} placeholder="まなぶ"/><Text style={styles.sectionLabel}>Mnemonic</Text><TextInput style={[styles.input, styles.multiline]} value={mnemonic} onChangeText={setMnemonic} multiline placeholder="Your memory story..."/><Text style={styles.sectionLabel}>First vocabulary example (optional)</Text><TextInput style={styles.input} value={vocabWord} onChangeText={setVocabWord} placeholder="Word, e.g. 学生"/><TextInput style={[styles.input, { marginTop: 10 }]} value={vocabReading} onChangeText={setVocabReading} placeholder="Reading, e.g. がくせい"/><TextInput style={[styles.input, { marginTop: 10 }]} value={vocabMeaning} onChangeText={setVocabMeaning} placeholder="Meaning, e.g. student"/><Pressable style={[styles.primary, !character.trim() && styles.disabledButton]} disabled={!character.trim()} onPress={add}><Text style={styles.primaryText}>Add to deck</Text></Pressable></ScrollView>;
}

  const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f7fb' },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }, title: { fontSize: 28, fontWeight: '800', color: '#17324d' }, subtitle: { color: '#64829a', marginTop: 3 },
  content: { flex: 1 }, scroll: { padding: 20, paddingBottom: 32 }, compactReading: { padding: 12, paddingBottom: 16 }, compactScopeRow: { gap: 6, marginBottom: 6 }, compactScopeButton: { paddingVertical: 6, borderRadius: 9 }, compactScopeText: { fontSize: 11 }, compactReadingWord: { fontSize: 68, textAlign: 'center', marginVertical: 4, fontWeight: '700' }, compactAnswerOption: { padding: 8, marginTop: 5 }, compactWritingScroll: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6 }, compactWritingPrompt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }, compactWritingKeyword: { fontSize: 16, fontWeight: '700', color: '#17324d' }, compactDrawingPad: { height: 196, marginTop: 8 }, compactWritingStatus: { fontSize: 13, lineHeight: 18 }, compactWriteFooter: { paddingHorizontal: 12, paddingTop: 2, paddingBottom: 6 }, compactButtonRow: { gap: 8, marginTop: 4 }, compactActionButton: { paddingVertical: 8 }, compactPrimaryButton: { paddingVertical: 10 }, compactRecallScroll: { padding: 12, paddingBottom: 10 }, compactAnswerKanji: { fontSize: 32 }, mixedCompactHeader: { paddingHorizontal: 16, paddingTop: 5, paddingBottom: 3 }, mixedCompactTitle: { fontSize: 14, fontWeight: '800', color: '#17324d' }, mixedCompactProgress: { fontSize: 12, color: '#6d6a64' }, h1: { fontSize: 24, fontWeight: '800', marginBottom: 8, color: '#17324d' }, h2: { fontSize: 20, fontWeight: '700', marginBottom: 8, color: '#17324d' }, body: { fontSize: 16, lineHeight: 24, color: '#4e4a45' },
  sectionLabel: { marginTop: 20, marginBottom: 8, fontWeight: '800', color: '#5486a8', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 }, statsRow: { flexDirection: 'row', gap: 8 }, stat: { flex: 1, backgroundColor: '#e7f3fb', borderRadius: 14, padding: 10, alignItems: 'center' }, statNum: { fontSize: 22, fontWeight: '800' }, statLabel: { fontSize: 11, color: '#777', textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, kanjiCard: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#d5e7f3' }, kanjiCardSelected: { borderWidth: 2, borderColor: '#62a9d8', backgroundColor: '#edf7fd' }, kanji: { fontSize: 42, fontWeight: '700' }, keyword: { fontWeight: '700', marginTop: 4 }, status: { color: '#888', marginTop: 5, textTransform: 'capitalize' }, detailCard: { marginTop: 14, backgroundColor: '#f8fbfe', borderRadius: 18, padding: 18 }, bigKanji: { fontSize: 78, fontWeight: '700', textAlign: 'center', marginVertical: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16 }, pill: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 999, backgroundColor: '#e2f0f9' }, pillActive: { backgroundColor: '#c8e7f8' }, pillText: { fontSize: 12, fontWeight: '700' }, vocabEditorRow: { marginTop: 14, padding: 12, backgroundColor: '#fff', borderRadius: 12 }, vocabEditorInput: { marginTop: 8 }, removeText: { color: '#9b3f38', fontWeight: '700', paddingTop: 10 }, flexButton: { flex: 1 },
  drawingPad: { height: 320, marginTop: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#c9dfed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, drawingGuide: { fontSize: 230, color: '#dedbd5', fontWeight: '400', includeFontPadding: false }, drawingAnswer: { color: '#1d1d1f' }, inkDot: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#34312d' }, buttonRow: { flexDirection: 'row', gap: 10, marginTop: 12 }, writeFooter: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, backgroundColor: '#fff' }, practiceHeader: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 }, practiceModeRow: { flexDirection: 'row', gap: 6 }, practiceModeButton: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd5ca', borderRadius: 10, paddingVertical: 7, alignItems: 'center' }, practiceModeText: { fontSize: 12, color: '#4e4a45', fontWeight: '700' }, lifelineButton: { marginTop: 8 }, secondaryButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#e2f0f9', alignItems: 'center' }, secondaryText: { color: '#1d1d1f', fontWeight: '700' }, primary: { marginTop: 18, backgroundColor: '#398fc5', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }, disabledButton: { opacity: 0.45 }, primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' }, mixedHeader: { paddingHorizontal: 20, paddingTop: 20 }, mixedNext: { marginHorizontal: 20, marginBottom: 20, backgroundColor: '#398fc5', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  quizKanji: { fontSize: 120, textAlign: 'center', marginVertical: 18, fontWeight: '700' }, answerKanji: { fontSize: 42, fontWeight: '700', color: '#1d1d1f', textAlign: 'center' }, readingBox: { backgroundColor: '#f4f9fd', borderRadius: 16, padding: 16 }, vocabCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10 }, vocabWord: { fontSize: 22, fontWeight: '800' }, reading: { fontSize: 15, color: '#6d6a64', marginVertical: 2 }, mnemonicCard: { backgroundColor: '#eaf5fc', borderRadius: 18, padding: 20, marginTop: 10 }, feedback: { backgroundColor: '#f7fbfe', borderRadius: 16, padding: 16, marginTop: 14 }, feedbackTitle: { fontSize: 17, fontWeight: '800', color: '#1d1d1f', marginBottom: 8 }, meaningClue: { fontSize: 17, fontWeight: '700', color: '#4e4a45', marginBottom: 12 },
  answerOption: { backgroundColor: '#f8fbfe', borderRadius: 12, borderWidth: 1, borderColor: '#cfe2ef', padding: 14, marginTop: 8 }, answerOptionSelected: { borderColor: '#1d1d1f', backgroundColor: '#eee9e1' }, scopeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 }, scopeButton: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd5ca', borderRadius: 12, paddingVertical: 11, alignItems: 'center' }, scopeButtonActive: { backgroundColor: '#398fc5', borderColor: '#398fc5' }, scopeText: { fontSize: 13, color: '#4e4a45', fontWeight: '700' }, scopeTextActive: { color: '#fff' }, input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd5ca', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }, answerInput: { marginTop: 16 }, multiline: { minHeight: 120, textAlignVertical: 'top' }, navShell: { height: 49, backgroundColor: '#eaf4fb', borderTopWidth: 1, borderTopColor: '#d6e8f4' }, navScroll: { flexGrow: 0, flexShrink: 0, height: 48 }, nav: { flexDirection: 'row' }, navButton: { minWidth: 78, height: 48, justifyContent: 'center', alignItems: 'center' }, navButtonActive: { backgroundColor: '#cfeafa', borderRadius: 12 }, navText: { fontSize: 11, color: '#64829a' }, navTextActive: { color: '#1e6697', fontWeight: '800' }
});
