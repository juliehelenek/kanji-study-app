import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Kanji, KanjiStatus, starterKanji } from './data';

type Tab = 'learn' | 'write' | 'read' | 'mnemonic' | 'add';

const tabs: { id: Tab; label: string }[] = [
  { id: 'learn', label: 'Learn' },
  { id: 'write', label: 'Write' },
  { id: 'read', label: 'Readings' },
  { id: 'mnemonic', label: 'Mnemonic' },
  { id: 'add', label: 'Add' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('learn');
  const [kanji, setKanji] = useState<Kanji[]>(starterKanji);
  const [selected, setSelected] = useState(0);
  const current = kanji[selected] ?? kanji[0];

  const next = () => setSelected((i) => (i + 1) % Math.max(kanji.length, 1));

  const updateStatus = (status: KanjiStatus) => {
    setKanji((items) => items.map((k, i) => i === selected ? { ...k, status } : k));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Kanji Study</Text>
        <Text style={styles.subtitle}>Your personal Japanese study deck</Text>
      </View>

      <View style={styles.content}>
        {tab === 'learn' && <LearnScreen kanji={kanji} selected={selected} setSelected={setSelected} updateStatus={updateStatus} />}
        {tab === 'write' && <WriteScreen current={current} next={next} />}
        {tab === 'read' && <ReadingsScreen current={current} next={next} />}
        {tab === 'mnemonic' && <MnemonicScreen current={current} next={next} />}
        {tab === 'add' && <AddScreen onAdd={(k) => { setKanji((items) => [...items, k]); setSelected(kanji.length); setTab('learn'); }} />}
      </View>

      <View style={styles.nav}>
        {tabs.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.navButton, tab === t.id && styles.navButtonActive]}>
            <Text style={[styles.navText, tab === t.id && styles.navTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function LearnScreen({ kanji, selected, setSelected, updateStatus }: { kanji: Kanji[]; selected: number; setSelected: (n: number) => void; updateStatus: (s: KanjiStatus) => void }) {
  const counts = useMemo(() => ({
    new: kanji.filter(k => k.status === 'new').length,
    unfamiliar: kanji.filter(k => k.status === 'unfamiliar').length,
    familiar: kanji.filter(k => k.status === 'familiar').length,
    mastered: kanji.filter(k => k.status === 'mastered').length,
  }), [kanji]);
  return <ScrollView contentContainerStyle={styles.scroll}>
    <Text style={styles.h1}>Study deck</Text>
    <View style={styles.statsRow}>{Object.entries(counts).map(([k, v]) => <View style={styles.stat} key={k}><Text style={styles.statNum}>{v}</Text><Text style={styles.statLabel}>{k}</Text></View>)}</View>
    <Text style={styles.sectionLabel}>Kanji</Text>
    <View style={styles.grid}>{kanji.map((k, i) => <Pressable key={`${k.character}-${i}`} onPress={() => setSelected(i)} style={[styles.kanjiCard, i === selected && styles.kanjiCardSelected]}><Text style={styles.kanji}>{k.character}</Text><Text style={styles.keyword}>{k.keyword}</Text><Text style={styles.status}>{k.status}</Text></Pressable>)}</View>
    {kanji[selected] && <View style={styles.detailCard}><Text style={styles.bigKanji}>{kanji[selected].character}</Text><Text style={styles.h2}>{kanji[selected].keyword}</Text><Text style={styles.body}>On-yomi: {kanji[selected].onyomi.join(' / ') || '—'}</Text><Text style={styles.body}>Kun-yomi: {kanji[selected].kunyomi.join(' / ') || '—'}</Text><View style={styles.statusRow}>{(['new','unfamiliar','familiar','mastered'] as KanjiStatus[]).map(s => <Pressable key={s} onPress={() => updateStatus(s)} style={[styles.pill, kanji[selected].status === s && styles.pillActive]}><Text style={styles.pillText}>{s}</Text></Pressable>)}</View></View>}
  </ScrollView>;
}

function WriteScreen({ current, next }: { current: Kanji; next: () => void }) {
  return <ScrollView contentContainerStyle={styles.scroll}>
    <Text style={styles.h1}>Kanji writing</Text><Text style={styles.body}>Stage 1 placeholder: the writing surface is ready to become a true stroke-order tracer.</Text>
    <View style={styles.traceBox}><Text style={styles.traceGuide}>{current.character}</Text><Text style={styles.traceHint}>Trace over the guide here</Text></View>
    <Pressable style={styles.primary} onPress={next}><Text style={styles.primaryText}>Next kanji</Text></Pressable>
  </ScrollView>;
}

function ReadingsScreen({ current, next }: { current: Kanji; next: () => void }) {
  return <ScrollView contentContainerStyle={styles.scroll}>
    <Text style={styles.h1}>Kanji readings</Text><Text style={styles.body}>What is the reading?</Text>
    <Text style={styles.quizKanji}>{current.character}</Text>
    <View style={styles.readingBox}><Text style={styles.body}>On: {current.onyomi.join(' / ') || '—'}</Text><Text style={styles.body}>Kun: {current.kunyomi.join(' / ') || '—'}</Text></View>
    <Text style={styles.sectionLabel}>Example vocabulary</Text>
    {current.vocab.map(v => <View key={v.word} style={styles.vocabCard}><Text style={styles.vocabWord}>{v.word}</Text><Text style={styles.reading}>{v.reading}</Text><Text style={styles.body}>{v.meaning}</Text></View>)}
    <Pressable style={styles.primary} onPress={next}><Text style={styles.primaryText}>Next kanji</Text></Pressable>
  </ScrollView>;
}

function MnemonicScreen({ current, next }: { current: Kanji; next: () => void }) {
  return <ScrollView contentContainerStyle={styles.scroll}>
    <Text style={styles.h1}>Mnemonic device</Text><Text style={styles.bigKanji}>{current.character}</Text><Text style={styles.h2}>{current.keyword}</Text><View style={styles.mnemonicCard}><Text style={styles.body}>{current.mnemonic}</Text></View>
    <Text style={styles.sectionLabel}>Use it in context</Text>{current.vocab.slice(0, 2).map(v => <View style={styles.vocabCard} key={v.word}><Text style={styles.vocabWord}>{v.word}</Text><Text style={styles.reading}>{v.reading}</Text><Text style={styles.body}>{v.meaning}</Text></View>)}
    <Pressable style={styles.primary} onPress={next}><Text style={styles.primaryText}>Next kanji</Text></Pressable>
  </ScrollView>;
}

function AddScreen({ onAdd }: { onAdd: (k: Kanji) => void }) {
  const [character, setCharacter] = useState(''); const [keyword, setKeyword] = useState(''); const [mnemonic, setMnemonic] = useState(''); const [on, setOn] = useState(''); const [kun, setKun] = useState('');
  const add = () => { if (!character.trim()) return; onAdd({ character: character.trim(), keyword: keyword.trim() || 'New kanji', mnemonic: mnemonic.trim() || 'Add a mnemonic later.', onyomi: on.split(/[,/ ]+/).filter(Boolean), kunyomi: kun.split(/[,/ ]+/).filter(Boolean), vocab: [], status: 'new' }); setCharacter(''); setKeyword(''); setMnemonic(''); setOn(''); setKun(''); };
  return <ScrollView contentContainerStyle={styles.scroll}><Text style={styles.h1}>Add kanji</Text><Text style={styles.body}>This is the manual version. The textbook-photo importer is the next build step.</Text><Text style={styles.sectionLabel}>Kanji</Text><TextInput style={styles.input} value={character} onChangeText={setCharacter} placeholder="例: 学"/><Text style={styles.sectionLabel}>Keyword</Text><TextInput style={styles.input} value={keyword} onChangeText={setKeyword} placeholder="example: LEARN"/><Text style={styles.sectionLabel}>On-yomi</Text><TextInput style={styles.input} value={on} onChangeText={setOn} placeholder="ガク"/><Text style={styles.sectionLabel}>Kun-yomi</Text><TextInput style={styles.input} value={kun} onChangeText={setKun} placeholder="まなぶ"/><Text style={styles.sectionLabel}>Mnemonic</Text><TextInput style={[styles.input, styles.multiline]} value={mnemonic} onChangeText={setMnemonic} multiline placeholder="Your memory story..."/><Pressable style={styles.primary} onPress={add}><Text style={styles.primaryText}>Add to deck</Text></Pressable></ScrollView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f4ee' }, header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }, title: { fontSize: 28, fontWeight: '800', color: '#1d1d1f' }, subtitle: { color: '#6f6a62', marginTop: 3 }, content: { flex: 1 }, scroll: { padding: 20, paddingBottom: 32 }, h1: { fontSize: 24, fontWeight: '800', marginBottom: 8, color: '#1d1d1f' }, h2: { fontSize: 20, fontWeight: '700', marginBottom: 8, color: '#1d1d1f' }, body: { fontSize: 16, lineHeight: 24, color: '#4e4a45' }, sectionLabel: { marginTop: 20, marginBottom: 8, fontWeight: '800', color: '#6f6a62', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 }, statsRow: { flexDirection: 'row', gap: 8 }, stat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10, alignItems: 'center' }, statNum: { fontSize: 22, fontWeight: '800' }, statLabel: { fontSize: 11, color: '#777', textTransform: 'capitalize' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, kanjiCard: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e8e2d9' }, kanjiCardSelected: { borderWidth: 2, borderColor: '#1d1d1f' }, kanji: { fontSize: 42, fontWeight: '700' }, keyword: { fontWeight: '700', marginTop: 4 }, status: { color: '#888', marginTop: 5, textTransform: 'capitalize' }, detailCard: { marginTop: 14, backgroundColor: '#fff', borderRadius: 18, padding: 18 }, bigKanji: { fontSize: 78, fontWeight: '700', textAlign: 'center', marginVertical: 8 }, statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16 }, pill: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 999, backgroundColor: '#eee9e1' }, pillActive: { backgroundColor: '#d7e7d8' }, pillText: { fontSize: 12, fontWeight: '700' }, traceBox: { height: 300, marginTop: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#ddd5ca', alignItems: 'center', justifyContent: 'center' }, traceGuide: { fontSize: 210, color: '#ddd5ca', fontWeight: '400' }, traceHint: { position: 'absolute', bottom: 16, color: '#8a847b' }, primary: { marginTop: 18, backgroundColor: '#1d1d1f', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }, primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' }, quizKanji: { fontSize: 120, textAlign: 'center', marginVertical: 18, fontWeight: '700' }, readingBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16 }, vocabCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10 }, vocabWord: { fontSize: 22, fontWeight: '800' }, reading: { fontSize: 15, color: '#6d6a64', marginVertical: 2 }, mnemonicCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, marginTop: 10 }, input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd5ca', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }, multiline: { minHeight: 120, textAlignVertical: 'top' }, nav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e8e2d9', paddingBottom: 4 }, navButton: { flex: 1, paddingVertical: 10, alignItems: 'center' }, navButtonActive: { backgroundColor: '#f0ece5' }, navText: { fontSize: 11, color: '#777' }, navTextActive: { color: '#1d1d1f', fontWeight: '800' }
});
