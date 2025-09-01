// app.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  View, Text, Image, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform, BackHandler,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path, G, Circle, Text as SvgText, Line as SvgLine } from "react-native-svg";

/* ===== Tema ===== */
const C = { bg: "#000000", fg: "#FFFFFF", tz: "#00C5C8", border: "#1f1f1f" };
SplashScreen.preventAutoHideAsync().catch(() => {});

/* ===== Utils ===== */
const pad2 = (n) => String(n).padStart(2, "0");
const mmss = (s) => `${pad2(Math.floor(Math.max(0, s) / 60))}:${pad2(Math.floor(Math.max(0, s) % 60))}`;
const hms = (s)=>`${pad2(Math.floor(s/3600))}:${pad2(Math.floor((s%3600)/60))}:${pad2(Math.floor(s%60))}`;
const pace100 = (m, s) => !m || !s ? "--:--/100m" : `${mmss((s / m) * 100)}/100m`;
const norm = (s) => String(s || "").trim().toLowerCase();
const san100 = (s) => String(s ?? "").replace(/[\r\n]/g, " ").slice(0, 100);
const today = ()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d, n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const brToKey = (dataBR)=>{ const d = dataBR?.split("/"); if(d?.length===3){ return `${d[2]}-${d[1]}-${d[0]}`; } return ""; };

/* BR */
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
const formatHoraBR = (v) => { const d = onlyDigits(v).slice(0, 4); return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`; };
const formatDataBR = (v) => { const d = onlyDigits(v).slice(0, 8); if (d.length <= 2) return d; if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`; return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`; };
function nowBR() { const t = new Date(); return { dataBR: `${pad2(t.getDate())}/${pad2(t.getMonth() + 1)}/${t.getFullYear()}`, horaBR: `${pad2(t.getHours())}:${pad2(t.getMinutes())}` }; }
function brToIso(dataBR, horaBR) {
  const d = onlyDigits(dataBR), h = onlyDigits(horaBR);
  if (d.length !== 8 || h.length < 3) return "";
  const dd = d.slice(0, 2), mm = d.slice(2, 4), yyyy = d.slice(4);
  const hh = h.slice(0, 2), min = h.slice(2, 4) || "00";
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/* ===== Header/Screen ===== */
function Header({ title }) {
  return (
    <View style={styles.header}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.tz, marginRight: 8 }} />
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <Image source={require("./assets/logo.png")} resizeMode="contain" style={{ height: 32, width: 140 }} />
    </View>
  );
}
const KB_OFFSET = 110;
function Screen({ children, scrollRef }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={KB_OFFSET}>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 96 }}>
        <View style={{ maxWidth: 900, width: "100%", alignSelf: "center", paddingHorizontal: 16, paddingTop: 16 }}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ===== Menu ===== */
function MenuScreen({ goto }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Image source={require("./assets/blacc.png")} style={{ width: 180, height: 180 }} resizeMode="contain" />
      </View>
      <View style={styles.menuBar}>
        <TouchableOpacity onPress={() => goto("prof")} style={styles.menuIconBtn}><Image source={require("./assets/professor.png")} style={styles.menuIcon} resizeMode="contain" /></TouchableOpacity>
        <TouchableOpacity onPress={() => goto("alunos")} style={styles.menuIconBtn}><Image source={require("./assets/aluno.png")} style={styles.menuIcon} resizeMode="contain" /></TouchableOpacity>
        <TouchableOpacity onPress={() => goto("turmas")} style={styles.menuIconBtn}><Image source={require("./assets/turmas.png")} style={styles.menuIcon} resizeMode="contain" /></TouchableOpacity>
        <TouchableOpacity onPress={() => goto("train")} style={styles.menuIconBtn}><Image source={require("./assets/sessao.png")} style={styles.menuIcon} resizeMode="contain" /></TouchableOpacity>
        <TouchableOpacity onPress={() => goto("rel")} style={styles.menuIconBtn}><Image source={require("./assets/relatorios.png")} style={styles.menuIcon} resizeMode="contain" /></TouchableOpacity>
      </View>
    </View>
  );
}

/* ===== Storage & Catálogos ===== */
const ALUNOS_KEY = "ALUNOS_V1";
const USERS_KEY = "USUARIOS_V1";
const TURMAS_KEY = "TURMAS_V1";
const SESSOES_KEY = "SESSOES_V4";

const ESTILOS = ["crawl", "costas", "peito", "borboleta", "medley"];
const CONJUNTO = [
  "braços alternados",
  "braços duplo",
  "braços submerso",
  "braços estendido",
  "braços recolhido",
  "pernas",
  "completo",
];
const APARELHOS = ["nenhum", "macarrão", "pé de pato", "paraquedas", "flutuador", "prancha", "palmar", "bolinha"];
const VIRADA = ["nenhum", "virada simples", "virada olimpica"];

/* ===== Professor (básico) ===== */
function ProfessorScreen() {
  const [nome, setNome] = useState("Professor Único");
  const [registro, setRegistro] = useState("CRP-0001");
  const [obs, setObs] = useState("");
  return (
    <Screen>
      <Text style={styles.h2}>Dados do professor</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Nome*</Text>
        <TextInput value={nome} onChangeText={setNome} placeholder="Nome" placeholderTextColor="#777" style={styles.input} />
        <Text style={styles.label}>Registro*</Text>
        <TextInput value={registro} onChangeText={setRegistro} placeholder="Registro" placeholderTextColor="#777" style={styles.input} />
        <Text style={styles.label}>Observação</Text>
        <TextInput value={obs} onChangeText={setObs} placeholder="Notas" placeholderTextColor="#777" style={[styles.input, { height: 100, textAlignVertical: "top" }]} multiline />
        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          <TouchableOpacity style={styles.primary}><Text style={{ color: "#000", fontWeight: "700" }}>Salvar</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondary}><Text style={{ color: C.tz, fontWeight: "700" }}>Limpar</Text></TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

/* ===== Alunos (resumido) ===== */
function AlunosScreen() {
  const [list, setList] = useState([]); const [editingId, setEditingId] = useState(null);
  const [nome, setNome] = useState(""); const [inscricao, setInscricao] = useState(""); const [tipo, setTipo] = useState("aluno"); const [instituicao, setInstituicao] = useState(""); const [quadroClinico, setQuadroClinico] = useState(""); const [obs, setObs] = useState("");
  useEffect(() => { (async () => { const raw = await AsyncStorage.getItem(ALUNOS_KEY); if (raw) setList(JSON.parse(raw)); })().catch(() => {}); }, []);
  async function persist(next) { setList(next); try { await AsyncStorage.setItem(ALUNOS_KEY, JSON.stringify(next)); } catch {} }
  function validate() { const e = []; if (!nome.trim()) e.push("Nome Social"); if (!inscricao.trim()) e.push("Inscrição"); if (!instituicao.trim()) e.push("Instituição"); if (!tipo) e.push("Tipo"); if (e.length) { Alert.alert("Campos obrigatórios", e.join(", ")); return false; } return true; }
  function onSave() {
    if (!validate()) return;
    const target = editingId ? list.find((a) => a.id === editingId) : list.find((a) => norm(a.inscricao) === norm(inscricao));
    const id = target ? target.id : String(Date.now()); const createdAt = target ? target.createdAt : Date.now();
    const payload = { id, nome: nome.trim(), inscricao: inscricao.trim().slice(0, 10), tipo, instituicao: instituicao.trim(), quadroClinico: san100(quadroClinico), obs: san100(obs), createdAt, updatedAt: Date.now() };
    const next = target ? list.map((a) => (a.id === id ? payload : a)) : [payload, ...list]; persist(next);
    setEditingId(null); setNome(""); setInscricao(""); setTipo("aluno"); setInstituicao(""); setQuadroClinico(""); setObs("");
  }
  return (
    <Screen>
      <Text style={styles.h2}>Alunos</Text>
      <View style={styles.card}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Nome Social*</Text>
            <TextInput value={nome} onChangeText={setNome} placeholder="Nome Social" placeholderTextColor="#777" style={styles.input} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Inscrição*</Text>
            <TextInput value={inscricao} onChangeText={(v) => setInscricao(v.replace(/\s+/g, "").slice(0, 10))} placeholder="Código (até 10)" placeholderTextColor="#777" style={styles.input} maxLength={10} />
          </View>
        </View>

        <Text style={styles.label}>Tipo*</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {["aluno", "personal", "novato"].map((v) => (
            <TouchableOpacity key={v} onPress={() => setTipo(v)} style={[styles.choice, { flexGrow: 1 }, tipo === v ? { backgroundColor: C.tz } : { borderColor: C.tz }]}>
              <Text style={[styles.choiceText, tipo === v ? { color: "#000" } : { color: C.tz }]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Instituição*</Text>
        <TextInput value={instituicao} onChangeText={setInstituicao} placeholder="Academia / Clube / Particular" placeholderTextColor="#777" style={styles.input} />

        <Text style={styles.label}>Quadro Clínico</Text>
        <TextInput value={quadroClinico} onChangeText={(v) => setQuadroClinico(san100(v))} placeholder="Até 100 caracteres" placeholderTextColor="#777" style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]} multiline maxLength={100} />

        <Text style={styles.label}>Observação</Text>
        <TextInput value={obs} onChangeText={(v) => setObs(san100(v))} placeholder="Até 100 caracteres" placeholderTextColor="#777" style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]} multiline maxLength={100} />

        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          <TouchableOpacity onPress={onSave} style={styles.primary}><Text style={{ color: "#000", fontWeight: "700" }}>{editingId ? "Atualizar" : "Salvar"}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setEditingId(null); setNome(""); setInscricao(""); setTipo("aluno"); setInstituicao(""); setQuadroClinico(""); setObs(""); }} style={styles.secondary}><Text style={{ color: C.tz, fontWeight: "700" }}>Limpar</Text></TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        {list.length === 0 && <Text style={{ color: "#bbb" }}>Nenhum aluno.</Text>}
        {list.map((a) => (
          <View key={a.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#222" }}>
            <Text style={{ color: C.fg, fontWeight: "700" }}>{a.nome} <Text style={{ color: "#999" }}>({a.inscricao || "-"})</Text></Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
function UsuariosScreen() { return <Screen><Text style={{ color: C.fg }}>Usuários — sem alterações.</Text></Screen>; }
function TurmasScreen() { return <Screen><Text style={{ color: C.fg }}>Turmas — sem alterações.</Text></Screen>; }

/* ===== Sessão do Dia ===== */
function SessaoScreen() {
  const scRef = useRef(null);
  const [alunos, setAlunos] = useState([]); const [sessoes, setSessoes] = useState([]);
  useEffect(() => { (async () => { try { const a = await AsyncStorage.getItem(ALUNOS_KEY); if (a) setAlunos(JSON.parse(a)); } catch {} try { const s = await AsyncStorage.getItem(SESSOES_KEY); if (s) setSessoes(JSON.parse(s)); } catch {} })(); }, []);
  async function persistSess(next) { setSessoes(next); try { await AsyncStorage.setItem(SESSOES_KEY, JSON.stringify(next)); } catch {} }

  const [mode, setMode] = useState("grupo");
  const [selIds, setSelIds] = useState([]);
  const [piscina, setPiscina] = useState(25);
  const { dataBR: d0, horaBR: h0 } = nowBR();
  const [dataBR, setDataBR] = useState(d0); const [horaBR, setHoraBR] = useState(h0);
  const [sessId, setSessId] = useState(null);

  const [qAluno, setQAluno] = useState("");
  const alunosFiltrados = useMemo(() => {
    const q = qAluno.trim().toLowerCase(); if (!q) return alunos;
    return alunos.filter((a) => a.nome.toLowerCase().includes(q) || (a.inscricao || "").includes(q));
  }, [alunos, qAluno]);

  const [blocks, setBlocks] = useState([]);
  const [activeBlockIds, setActiveBlockIds] = useState([]);
  const [rows, setRows] = useState({}); // rows[blockId][alunoId]
  const [results, setResults] = useState([]);

  const sessionStartRef = useRef(null);
  const tickRef = useRef(null);
  function ensureSessionStart() { if (!sessionStartRef.current) sessionStartRef.current = Date.now(); }
  function startTick() {
    if (tickRef.current) return;
    tickRef.current = setInterval(() => {
      setRows((prev) => {
        const now = Date.now(); const n = { ...prev };
        Object.keys(n).forEach((bid) => {
          const rmap = n[bid] || {};
          Object.keys(rmap).forEach((id) => { const r = rmap[id]; if (r?.running) { rmap[id] = { ...r, elapsed: Math.max(0, Math.floor((now - r.startTs) / 1000)) + (r.baseElapsed || 0) }; } });
          n[bid] = rmap;
        });
        return n;
      });
    }, 500);
  }
  function stopTickIfIdle() {
    setTimeout(() => {
      setRows((p) => {
        const any = Object.values(p).some((rmap) => Object.values(rmap || {}).some((r) => r.running));
        if (!any && tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
        return p;
      });
    }, 10);
  }

  function resetState() {
    setMode("grupo"); setSelIds([]); setPiscina(25);
    setBlocks([]); setActiveBlockIds([]); setRows({}); setResults([]); setSessId(null);
    sessionStartRef.current = null; if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    const n = nowBR(); setDataBR(n.dataBR); setHoraBR(n.horaBR); scRef.current?.scrollTo({ y: 0, animated: true });
  }

  function toggleSel(id) { if (mode === "individual") { setSelIds([id]); return; } setSelIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); }
  function selectAll() { if (mode === "grupo") setSelIds(alunosFiltrados.map((a) => a.id)); }
  function clearSel() { setSelIds([]); }

  function addBlock(data) {
    const participants = mode === "individual" ? (selIds[0] ? [selIds[0]] : []) : [...selIds];
    if (participants.length === 0) { Alert.alert("Selecione aluno(s) antes de adicionar o bloco."); return; }
    const b = {
      id: `b${Date.now()}${Math.floor(Math.random() * 999)}`,
      estilo: data.estilo || "crawl",
      conjunto: data.conjunto || "completo",
      aparelho: data.conjunto === "completo" ? "nenhum" : data.aparelho || "nenhum",
      virada: data.virada || "nenhum",
      metros: Number(data.metros || 200),
      reps: Number(data.reps || 1),
      participants,
    };
    setBlocks((old) => [b, ...old]);
    setSelIds([]); scRef.current?.scrollTo({ y: 0, animated: true });
  }
  function delBlock(id) {
    setBlocks((old) => old.filter((b) => b.id !== id));
    setActiveBlockIds((ids) => ids.filter((x) => x !== id));
    setRows((r) => { const n = { ...r }; delete n[id]; return n; });
    setResults((rs) => rs.filter((r) => r.blocoId !== id));
    stopTickIfIdle();
  }
  function startBlock(b) {
    const participants = b.participants || [];
    if (participants.length === 0) { Alert.alert("Bloco sem participantes", "Remova e crie novamente escolhendo aluno(s)."); return; }
    ensureSessionStart();
    setRows((prev) => {
      const base = { ...(prev[b.id] || {}) };
      participants.forEach((id) => {
        if (!base[id]) {
          base[id] = { meters: b.metros, min: "", sec: "", nota: 7, obs: "", running: false, baseElapsed: 0, elapsed: 0, startTs: null, startRel: null };
        }
      });
      return { ...prev, [b.id]: base };
    });
    setActiveBlockIds((ids) => (ids.includes(b.id) ? ids : [...ids, b.id]));
  }

  function startAluno(bid, id) {
    if (!activeBlockIds.includes(bid)) return;
    ensureSessionStart(); startTick();
    setRows((prev) => {
      const rmap = { ...(prev[bid] || {}) };
      const r = rmap[id] || { meters: 0, min: "", sec: "", nota: 7, obs: "", baseElapsed: 0, elapsed: 0 };
      rmap[id] = { ...r, running: true, startTs: Date.now(), startRel: r.startRel ?? Math.floor((Date.now() - sessionStartRef.current) / 1000) };
      return { ...prev, [bid]: rmap };
    });
  }
  function stopAluno(bid, id) {
    setRows((prev) => {
      const rmap = { ...(prev[bid] || {}) }; const r = rmap[id]; if (!r) return prev;
      const now = Date.now(); const elapsed = Math.max(0, Math.floor((now - (r.startTs || now)) / 1000)) + (r.baseElapsed || 0);
      rmap[id] = { ...r, running: false, baseElapsed: elapsed, elapsed, startTs: null };
      return { ...prev, [bid]: rmap };
    });
    stopTickIfIdle();
  }
  function adjustTime(bid, id, delta) {
    setRows((prev) => {
      const rmap = { ...(prev[bid] || {}) }; const r = rmap[id]; if (!r) return prev;
      const base = Math.max(0, (r.running ? r.elapsed : r.baseElapsed || 0) + delta);
      rmap[id] = { ...r, baseElapsed: base, elapsed: base };
      return { ...prev, [bid]: rmap };
    });
  }
  function concludeAluno(bid, id) {
    const r = (rows[bid] || {})[id]; if (!r) return;
    const total = r.min || r.sec ? parseInt(r.min || "0", 10) * 60 + parseInt(r.sec || "0", 10) : r.running ? r.elapsed : r.baseElapsed || 0;
    if (!total) { Alert.alert("Informe/registre o tempo."); return; }
    const bloco = blocks.find((b) => b.id === bid); if (!bloco) return;
    const payload = { blocoId: bid, alunoId: id, metros: Number(r.meters || bloco.metros), tempo: total, pace: pace100(Number(r.meters || bloco.metros), total), nota: r.nota || 7, obs: r.obs || "", inicio: r.startRel ?? 0 };
    setResults((arr) => [payload, ...arr]);
    setRows((prev) => { const rmap = { ...(prev[bid] || {}) }; rmap[id] = { ...rmap[id], running: false, baseElapsed: 0, elapsed: 0, min: "", sec: "", obs: "", startTs: null, startRel: null }; return { ...prev, [bid]: rmap }; });
    stopTickIfIdle();
  }

  function saveSessao() {
    if (blocks.length === 0) { Alert.alert("Adicione ao menos 1 bloco."); return; }
    const dataIso = brToIso(dataBR, horaBR);
    const payload = {
      id: sessId ?? `sess-${Date.now()}`,
      participantes: selIds, piscina, dataBR, horaBR, dataIso,
      blocos: blocks, resultados: results,
      createdAt: sessId ? sessoes.find((s) => s.id === sessId)?.createdAt : Date.now(),
      updatedAt: Date.now(),
    };
    const next = sessId ? sessoes.map((s) => (s.id === payload.id ? payload : s)) : [payload, ...sessoes];
    persistSess(next); setSessId(payload.id); Alert.alert("Sessão salva");
  }

  const [aba, setAba] = useState("nova");
  const [qSess, setQSess] = useState(""); const [janela, setJanela] = useState("7");
  function formatQueryDatesInline(str) {
    return str.replace(/(^|[^0-9])(\d{2})(\d{2})(\d{4})(?!\d)/g, (_, p, dd, mm, yyyy) => {
      const d = Number(dd), m = Number(mm);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return `${p}${pad2(d)}/${pad2(m)}/${yyyy}`;
      return `${p}${dd}${mm}${yyyy}`;
    });
  }
  const sesFiltradas = useMemo(() => {
    let arr = [...sessoes];
    if (janela !== "all") { const dias = Number(janela); const lim = Date.now() - dias * 86400000; arr = arr.filter((s) => (s.updatedAt || 0) >= lim); }
    const q = qSess.trim().toLowerCase(); if (!q) return arr;
    return arr.filter((s) => JSON.stringify(s).toLowerCase().includes(q));
  }, [sessoes, qSess, janela]);

  const activeActivities = useMemo(() => {
    return activeBlockIds.reduce((acc, bid) => {
      const blk = blocks.find((b) => b.id === bid);
      return acc + ((blk?.participants?.length) || 0);
    }, 0);
  }, [activeBlockIds, blocks]);

  return (
    <Screen scrollRef={scRef}>
      <Text style={styles.h2}>Sessão do Dia — Individual / Grupo</Text>

      {/* Abas */}
      <View style={[styles.card, { marginBottom: 12 }]}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[{ k: "nova", t: "Nova sessão" }, { k: "concluidas", t: "Concluídas" }].map((x) => (
            <TouchableOpacity key={x.k} onPress={() => setAba(x.k)} style={[styles.choice, aba === x.k ? { backgroundColor: C.tz } : { borderColor: C.tz }]}>
              <Text style={[styles.choiceText, aba === x.k ? { color: "#000" } : { color: C.tz }]}>{x.t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ===== CONCLUÍDAS ===== */}
      {aba === "concluidas" && (
        <View style={[styles.card, { marginBottom: 12 }]}>
          <Text style={styles.label}>Buscar</Text>
          <TextInput value={qSess} onChangeText={(v) => setQSess(formatQueryDatesInline(v))} onSubmitEditing={() => setQSess((v) => formatQueryDatesInline(v))} placeholder="Data (ex.: 25082025) ou texto" placeholderTextColor="#777" style={styles.input} />
          <Text style={[styles.label, { marginTop: 12 }]}>Período</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {[{ k: "7", t: "7 dias" }, { k: "15", t: "15 dias" }, { k: "30", t: "30 dias" }, { k: "365", t: "1 ano" }, { k: "all", t: "Todos" }].map((x) => (
              <TouchableOpacity key={x.k} onPress={() => setJanela(x.k)} style={[styles.choiceSm, janela === x.k ? { backgroundColor: C.tz } : { borderColor: C.tz }]}>
                <Text style={[styles.choiceTextSm, janela === x.k ? { color: "#000" } : { color: C.tz }]}>{x.t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: 10 }}>
            {sesFiltradas.length === 0 && <Text style={{ color: "#bbb" }}>Nenhuma sessão.</Text>}
            {sesFiltradas.map((s) => (
              <View key={s.id} style={{ paddingVertical: 8, borderBottomColor: "#222", borderBottomWidth: 1 }}>
                <Text style={{ color: C.fg, fontWeight: "700" }}>
                  {s.dataBR} {s.horaBR} • Piscina {s.piscina}m • {s.participantes.length} participante(s) • {s.blocos.length} bloco(s)
                </Text>
                <Text style={{ color: "#aaa", marginTop: 4 }}>
                  Blocos:{" "}
                  {s.blocos.map((b) =>
                    `${b.estilo} • ${b.conjunto} • ${b.aparelho} • ${b.virada} • ${b.metros}m${b.reps > 1 ? ` x${b.reps}` : ""} (${b.participants?.length || 0} part.)`
                  ).join(" | ")}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ===== NOVA ===== */}
      {aba === "nova" && (
        <>
          {/* Modo/participantes/data/hora/piscina */}
          <View style={[styles.card, { marginBottom: 12 }]}>
            <Text style={styles.label}>Modo</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              {["individual", "grupo"].map((m) => (
                <TouchableOpacity key={m} onPress={() => { setMode(m); if (m === "individual" && selIds.length > 1) setSelIds(selIds.slice(0, 1)); }} style={[styles.choice, mode === m ? { backgroundColor: C.tz } : { borderColor: C.tz }]}>
                  <Text style={[styles.choiceText, mode === m ? { color: "#000" } : { color: C.tz }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Participantes</Text>
            <TextInput value={qAluno} onChangeText={setQAluno} placeholder="Buscar aluno (nome/inscrição)" placeholderTextColor="#777" style={styles.input} />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {mode === "grupo" && <TouchableOpacity onPress={selectAll} style={styles.secondary}><Text style={{ color: C.tz, fontWeight: "700" }}>Selecionar todos</Text></TouchableOpacity>}
              <TouchableOpacity onPress={clearSel} style={styles.secondary}><Text style={{ color: C.tz, fontWeight: "700" }}>Limpar seleção</Text></TouchableOpacity>
            </View>

            <View style={{ maxHeight: 160, marginTop: 8 }}>
              <ScrollView>
                {alunosFiltrados.map((a) => {
                  const on = selIds.includes(a.id);
                  return (
                    <TouchableOpacity key={a.id} onPress={() => toggleSel(a.id)} style={{ paddingVertical: 6 }}>
                      <Text style={{ color: on ? C.tz : C.fg }}>{on ? "✓ " : ""}{a.nome} <Text style={{ color: "#999" }}>({a.inscricao || "-"})</Text></Text>
                    </TouchableOpacity>
                  );
                })}
                {alunosFiltrados.length === 0 && <Text style={{ color: "#777" }}>Nenhum aluno encontrado.</Text>}
              </ScrollView>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <View style={{ flex: 1, minWidth: 150 }}>
                <Text style={styles.label}>Data (dd/mm/aaaa)</Text>
                <TextInput value={dataBR} onChangeText={(v) => setDataBR(formatDataBR(v))} maxLength={10} keyboardType="number-pad" placeholder="dd/mm/aaaa" placeholderTextColor="#777" style={styles.input} />
              </View>
              <View style={{ width: 120, flexGrow: 1 }}>
                <Text style={styles.label}>Hora (hh:mm)</Text>
                <TextInput value={horaBR} onChangeText={(v) => setHoraBR(formatHoraBR(v))} maxLength={5} keyboardType="number-pad" placeholder="hh:mm" placeholderTextColor="#777" style={styles.input} />
              </View>
              <View style={{ width: 150, flexGrow: 1 }}>
                <Text style={styles.label}>Piscina (10–50 m)</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TouchableOpacity onPress={() => setPiscina((p) => Math.max(10, p - 1))} style={styles.secondary}><Text style={{ color: C.tz, fontWeight: "700" }}>-</Text></TouchableOpacity>
                  <Text style={{ color: C.fg, minWidth: 48, textAlign: "center" }}>{piscina} m</Text>
                  <TouchableOpacity onPress={() => setPiscina((p) => Math.min(50, p + 1))} style={styles.secondary}><Text style={{ color: C.tz, fontWeight: "700" }}>+</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Criar bloco */}
          <View style={[styles.card, { marginBottom: 12 }]}>
            <Text style={styles.label}>Criar bloco</Text>
            <BlocoCreator onAdd={addBlock} />
            <Text style={[styles.label, { marginTop: 8 }]}>Blocos</Text>
            {blocks.length === 0 && <Text style={{ color: "#bbb" }}>Nenhum bloco.</Text>}
            {blocks.map((b) => (
              <View key={b.id} style={{ paddingVertical: 8, borderBottomColor: "#222", borderBottomWidth: 1, gap: 6 }}>
                <Text style={{ color: C.fg }}>
                  {b.estilo} • {b.conjunto} • {b.aparelho} • {b.virada} • {b.metros}m{b.reps > 1 ? ` x${b.reps}` : ""} • {b.participants?.length || 0} participante(s)
                </Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <TouchableOpacity onPress={() => startBlock(b)} style={styles.primary}><Text style={{ color: "#000", fontWeight: "700" }}>Iniciar</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => delBlock(b.id)} style={styles.danger}><Text style={{ color: "#000", fontWeight: "700" }}>Excluir</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Blocos ativos */}
          {activeBlockIds.length > 0 && (
            <View style={[styles.card, { marginBottom: 12 }]}>
              <Text style={styles.label}>Blocos ativos: {activeBlockIds.length} • Atividades (por aluno): {activeActivities}</Text>
              {activeBlockIds.map((bid) => {
                const blk = blocks.find((x) => x.id === bid); if (!blk) return null;
                const rmap = rows[bid] || {}; const part = blk.participants || [];
                return (
                  <View key={bid} style={{ paddingVertical: 8, borderBottomColor: "#222", borderBottomWidth: 1 }}>
                    <Text style={{ color: C.fg, fontWeight: "700" }}>
                      {blk.estilo} • {blk.conjunto} • {blk.aparelho} • {blk.virada} • {blk.metros}m ({part.length} participante(s))
                    </Text>

                    {part.length === 0 && <Text style={{ color: "#bbb" }}>Nenhum participante neste bloco.</Text>}

                    {part.map((id) => {
                      const a = alunos.find((x) => x.id === id);
                      const r = rmap[id] || {};
                      const tempo = r.min || r.sec ? parseInt(r.min || "0", 10) * 60 + parseInt(r.sec || "0", 10) : r.elapsed || 0;
                      return (
                        <View key={id} style={{ marginTop: 8 }}>
                          <Text style={{ color: C.fg, fontWeight: "700" }}>{a ? a.nome : id}</Text>

                          <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                            <Text style={{ color: "#aaa" }}>Distância</Text>
                            <TextInput value={String(r.meters ?? blk.metros)} onChangeText={(v) => setRows((p) => ({ ...p, [bid]: { ...(p[bid] || {}), [id]: { ...(p[bid]?.[id] || {}), meters: v.replace(/[^0-9]/g, "") } } }))} keyboardType="numeric" placeholderTextColor="#777" style={[styles.input, { width: 90 }]} />
                            <Text style={{ color: "#aaa" }}>mm:ss</Text>
                            <TextInput value={r.min ?? ""} onChangeText={(v) => setRows((p) => ({ ...p, [bid]: { ...(p[bid] || {}), [id]: { ...(p[bid]?.[id] || {}), min: v.replace(/[^0-9]/g, "").slice(0, 2) } } }))} keyboardType="numeric" placeholder="mm" placeholderTextColor="#777" style={[styles.input, { width: 70 }]} />
                            <TextInput value={r.sec ?? ""} onChangeText={(v) => setRows((p) => ({ ...p, [bid]: { ...(p[bid] || {}), [id]: { ...(p[bid]?.[id] || {}), sec: v.replace(/[^0-9]/g, "").slice(0, 2) } } }))} keyboardType="numeric" placeholder="ss" placeholderTextColor="#777" style={[styles.input, { width: 70 }]} />
                            <Text style={{ color: "#aaa" }}>Tempo: <Text style={{ color: C.fg }}>{mmss(tempo)}</Text></Text>
                            <TouchableOpacity onPress={() => adjustTime(bid, id, -5)} style={styles.secondary}><Text style={{ color: C.tz, fontWeight: "700" }}>-5s</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => adjustTime(bid, id, +5)} style={styles.secondary}><Text style={{ color: C.tz, fontWeight: "700" }}>+5s</Text></TouchableOpacity>
                          </View>

                          <View style={{ flexDirection: "row", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <TouchableOpacity onPress={() => startAluno(bid, id)} style={styles.primary}><Text style={{ color: "#000", fontWeight: "700" }}>{r.running ? "Reiniciar" : "Start"}</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => stopAluno(bid, id)} style={styles.secondary}><Text style={{ color: C.tz, fontWeight: "700" }}>Stop</Text></TouchableOpacity>
                            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                              <Text style={{ color: "#aaa", alignSelf: "center" }}>Nota</Text>
                              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                                {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                                  <TouchableOpacity key={v} onPress={() => setRows((p) => ({ ...p, [bid]: { ...(p[bid] || {}), [id]: { ...(p[bid]?.[id] || {}), nota: v } } }))} style={[styles.choiceSm, (r.nota || 7) === v ? { backgroundColor: C.tz } : { borderColor: C.tz }]}>
                                    <Text style={[styles.choiceTextSm, (r.nota || 7) === v ? { color: "#000" } : { color: C.tz }]}>{v}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          </View>

                          <TextInput value={r.obs ?? ""} onChangeText={(v) => setRows((p) => ({ ...p, [bid]: { ...(p[bid] || {}), [id]: { ...(p[bid]?.[id] || {}), obs: v } } }))} placeholder="Observação" placeholderTextColor="#777" style={[styles.input, { marginTop: 6 }]} />
                          <Text style={{ color: "#888", marginTop: 4 }}>Ritmo: {pace100(Number(r.meters || blk.metros), tempo)}</Text>

                          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                            <TouchableOpacity onPress={() => concludeAluno(bid, id)} style={styles.primary}><Text style={{ color: "#000", fontWeight: "700" }}>✓ Concluir</Text></TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          )}

          {/* Linha do tempo */}
          <View style={[styles.card, { marginBottom: 12 }]}>
            <Text style={styles.label}>Linha do tempo</Text>
            {results.length === 0 && <Text style={{ color: "#bbb" }}>Sem resultados ainda.</Text>}
            {results.map((r, i) => {
              const aluno = alunos.find((a) => a.id === r.alunoId);
              const blk = blocks.find((b) => b.id === r.blocoId);
              return (
                <View key={`${r.blocoId}-${r.alunoId}-${i}`} style={{ paddingVertical: 6, borderBottomColor: "#222", borderBottomWidth: 1 }}>
                  <Text style={{ color: C.fg }}>
                    {mmss(r.inicio || 0)} — {aluno ? aluno.nome : r.alunoId} — {blk ? blk.estilo : ""} — {r.metros}m — {mmss(r.tempo)} — {r.pace} — Nota {r.nota} • {aluno ? aluno.nome : ""}
                  </Text>
                  {!!r.obs && <Text style={{ color: "#888", fontSize: 12 }}>Obs: {r.obs}</Text>}
                </View>
              );
            })}
          </View>

          {/* Ações sessão */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity onPress={saveSessao} style={styles.primary}><Text style={{ color: "#000", fontWeight: "700" }}>{sessId ? "Atualizar sessão" : "Salvar sessão"}</Text></TouchableOpacity>
            <TouchableOpacity onPress={resetState} style={styles.secondary}><Text style={{ color: C.tz, fontWeight: "700" }}>Nova sessão</Text></TouchableOpacity>
          </View>
        </>
      )}
    </Screen>
  );
}

/* ===== Criador de blocos ===== */
function BlocoCreator({ onAdd }) {
  const [estilo, setEstilo] = useState("crawl");
  const [conjunto, setConjunto] = useState("completo");
  const [aparelho, setAparelho] = useState("nenhum");
  const [virada, setVirada] = useState("nenhum");
  const [metros, setMetros] = useState("200");
  const [reps, setReps] = useState("1");
  useEffect(()=>{ if(conjunto==="completo") setAparelho("nenhum"); },[conjunto]);
  function add(){ onAdd({estilo, conjunto, aparelho, virada, metros:Number(metros||0), reps:Number(reps||1)}); setEstilo("crawl"); setConjunto("completo"); setAparelho("nenhum"); setVirada("nenhum"); setMetros("200"); setReps("1"); }
  return (
    <View>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
        <PickerInline label="Estilo" data={ESTILOS} value={estilo} onChange={setEstilo}/>
        <PickerInline label="Conjunto" data={CONJUNTO} value={conjunto} onChange={setConjunto}/>
        <PickerInline label="Aparelho" data={APARELHOS} value={aparelho} onChange={setAparelho} disabled={conjunto==="completo"}/>
        <PickerInline label="Virada" data={VIRADA} value={virada} onChange={setVirada}/>
        <InlineField label="Distância (m)" value={metros} setValue={setMetros} width={120}/>
        <InlineField label="Reps" value={reps} setValue={setReps} width={100}/>
      </View>
      <View style={{ marginTop:8 }}>
        <TouchableOpacity onPress={add} style={styles.primary}><Text style={{ color:'#000', fontWeight:'700' }}>Adicionar bloco</Text></TouchableOpacity>
      </View>
    </View>
  );
}
function PickerInline({ label, data, value, onChange, disabled }) {
  return (
    <View style={{ width: 180, opacity: disabled?0.5:1 }}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {data.map((v) => (
            <TouchableOpacity key={v} disabled={disabled} onPress={() => onChange(v)} style={[styles.choiceSm, value === v ? { backgroundColor: C.tz } : { borderColor: C.tz }]}>
              <Text style={[styles.choiceTextSm, value === v ? { color: "#000" } : { color: C.tz }]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
function InlineField({ label, value, setValue, width = 140 }) {
  return (
    <View style={{ width }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={String(value)} onChangeText={setValue} placeholderTextColor="#777" style={styles.input} keyboardType="numeric" />
    </View>
  );
}

/* ===== Relatórios ===== */

// cores por série (1º,2º,3º,4º treino no dia)
const SERIES_COLORS = ["#E53935", "#1E88E5", "#FB8C00", "#8E24AA"]; // vermelho, azul, laranja, roxo

// agrega por dia dentro do período
function buildDailySeries({ sessoes, alunos, alunoId, estiloSel, days }) {
  // mapa dayKey -> array de sessions no dia [{metros, tempo, alunoId, estilo}]
  const map = {};
  (sessoes||[]).forEach(s=>{
    const dayKey = brToKey(s.dataBR);
    (s.resultados||[]).forEach(r=>{
      const blk = (s.blocos||[]).find(b=>b.id===r.blocoId);
      if(!blk) return;
      if(estiloSel && estiloSel!=="todos" && blk.estilo!==estiloSel) return;
      if(alunoId && r.alunoId!==alunoId) return;
      if(!map[dayKey]) map[dayKey]=[];
      map[dayKey].push({ metros:Number(r.metros||0), tempo:Number(r.tempo||0), alunoId:r.alunoId, estilo:blk.estilo });
    });
  });
  // ordenar por horário não temos, então ordem de inserção
  // construir até 4 séries por posição de treino no dia
  const distSeries = [[],[],[],[]]; // por dia
  const timeSeries = [[],[],[],[]];

  days.forEach(day=>{
    const key = day.key;
    const arr = (map[key]||[]);
    // soma por aluno/atividade preservando ordem
    arr.forEach((it,idx)=>{
      if(idx<4){
        distSeries[idx].push(it.metros);
        timeSeries[idx].push(it.tempo);
      }
    });
    // preencher faltantes com 0
    for(let i=arr.length;i<4;i++){ distSeries[i].push(0); timeSeries[i].push(0); }
  });

  // totais por dia
  const dailyDist = days.map((_,i)=> distSeries.reduce((a,s)=>a+(s[i]||0),0));
  const dailyTime = days.map((_,i)=> timeSeries.reduce((a,s)=>a+(s[i]||0),0));
  const totalDist = dailyDist.reduce((a,x)=>a+x,0);
  const totalTime = dailyTime.reduce((a,x)=>a+x,0);
  const avgDist = days.length? Math.round(totalDist/days.length):0;
  const avgTime = days.length? Math.round(totalTime/days.length):0;

  return { distSeries, timeSeries, dailyDist, dailyTime, totalDist, totalTime, avgDist, avgTime };
}

function makeDays(periodDays){
  const end = today();
  const start = addDays(end, -(periodDays-1));
  const days = [];
  for(let d=0; d<periodDays; d++){
    const cur = addDays(start, d);
    const key = `${cur.getFullYear()}-${pad2(cur.getMonth()+1)}-${pad2(cur.getDate())}`;
    days.push({ key, label:`${pad2(cur.getDate())}/${pad2(cur.getMonth()+1)}` });
  }
  return days;
}

function RelatoriosScreen() {
  const [sessoes, setSessoes] = useState([]); const [alunos, setAlunos] = useState([]);
  const [alunoId, setAlunoId] = useState(""); const [estilo, setEstilo] = useState("crawl");
  const [period, setPeriod] = useState(7); // 7,15,30,365
  const [tab, setTab] = useState("dist"); // dist | tempo

  useEffect(() => { (async () => { try { const s = await AsyncStorage.getItem(SESSOES_KEY); if (s) setSessoes(JSON.parse(s)); } catch {} try { const a = await AsyncStorage.getItem(ALUNOS_KEY); if (a) setAlunos(JSON.parse(a)); } catch {} })(); }, []);

  const days = useMemo(()=>makeDays(period), [period]);
  const agg = useMemo(()=>buildDailySeries({ sessoes, alunos, alunoId, estiloSel:estilo, days }), [sessoes, alunos, alunoId, estilo, days]);

  // lista “Todos”: estilo | % | aluno  (percentual sobre distância total do filtro)
  const participacao = useMemo(()=>{
    if(alunoId) return [];
    const map = {};
    let total = 0;
    (sessoes||[]).forEach(s=>{
      (s.resultados||[]).forEach(r=>{
        const blk = (s.blocos||[]).find(b=>b.id===r.blocoId);
        if(!blk) return;
        if(estilo && estilo!=="todos" && blk.estilo!==estilo) return;
        total += Number(r.metros||0);
        const nome = (alunos.find(a=>a.id===r.alunoId)?.nome)||r.alunoId;
        const key = `${blk.estilo}__${nome}`;
        map[key] = (map[key]||0) + Number(r.metros||0);
      });
    });
    const arr = Object.entries(map).map(([k,v])=>{
      const [e, nome] = k.split("__");
      const pct = total? Math.round((v/total)*100):0;
      return { estilo:e, aluno:nome, pct };
    }).sort((a,b)=>b.pct-a.pct);
    return arr;
  }, [sessoes, alunos, estilo, alunoId]);

  return (
    <Screen>
      <Text style={styles.h2}>Relatórios</Text>

      {/* Filtros */}
      <View style={[styles.card, { marginBottom: 12 }]}>
        <Text style={styles.label}>Período</Text>
        <View style={{ flexDirection:"row", gap:8, flexWrap:"wrap" }}>
          {[{k:7,t:"7d"},{k:15,t:"15d"},{k:30,t:"30d"},{k:365,t:"1a"}].map(x=>(
            <TouchableOpacity key={x.k} onPress={()=>setPeriod(x.k)}
              style={[styles.choiceSm, period===x.k?{backgroundColor:C.tz}:{borderColor:C.tz}]}>
              <Text style={[styles.choiceTextSm, period===x.k?{color:"#000"}:{color:C.tz}]}>{x.t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Aluno</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <TouchableOpacity onPress={() => setAlunoId("")} style={[styles.choiceSm, alunoId === "" ? { backgroundColor: C.tz } : { borderColor: C.tz }]}><Text style={[styles.choiceTextSm, alunoId === "" ? { color: "#000" } : { color: C.tz }]}>Todos</Text></TouchableOpacity>
          {alunos.map((a) => (
            <TouchableOpacity key={a.id} onPress={() => setAlunoId(a.id)} style={[styles.choiceSm, alunoId === a.id ? { backgroundColor: C.tz } : { borderColor: C.tz }]}><Text style={[styles.choiceTextSm, alunoId === a.id ? { color: "#000" } : { color: C.tz }]}>{a.nome}</Text></TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Estilo</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {["crawl","costas","peito","borboleta","medley","todos"].map((e) => (
            <TouchableOpacity key={e} onPress={() => setEstilo(e)} style={[styles.choiceSm, estilo === e ? { backgroundColor: C.tz } : { borderColor: C.tz }]}>
              <Text style={[styles.choiceTextSm, estilo === e ? { color: "#000" } : { color: C.tz }]}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Abas Distância/Tempo */}
        <View style={{ flexDirection:"row", gap:8, marginTop:12 }}>
          {[{k:"dist",t:"Distância"},{k:"tempo",t:"Tempo"}].map(x=>(
            <TouchableOpacity key={x.k} onPress={()=>setTab(x.k)}
              style={[styles.choice, tab===x.k?{backgroundColor:C.tz}:{borderColor:C.tz}]}>
              <Text style={[styles.choiceText, tab===x.k?{color:"#000"}:{color:C.tz}]}>{x.t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Gráfico principal */}
      {tab==="dist" ? (
        <View style={[styles.card, { marginBottom: 12 }]}>
          <Text style={styles.label}>Distância por dia</Text>
          <MultiSeriesDailyChart
            days={days}
            series={agg.distSeries}
            yUnit="m"
            yFmt={(v)=>`${Math.round(v)} m`}
            gridFromAvg={agg.avgDist}
          />
          <View style={{flexDirection:"row", gap:12, marginTop:8, flexWrap:"wrap"}}>
            <Kpi label="Distância total" value={`${agg.totalDist} m`} />
            <Kpi label="Média diária" value={`${agg.avgDist} m/dia`} />
          </View>
        </View>
      ) : (
        <View style={[styles.card, { marginBottom: 12 }]}>
          <Text style={styles.label}>Tempo por dia</Text>
          <MultiSeriesDailyChart
            days={days}
            series={agg.timeSeries}
            yUnit="s"
            yFmt={(v)=>hms(Math.round(v))}
            gridFromAvg={agg.avgTime}
          />
          <View style={{flexDirection:"row", gap:12, marginTop:8, flexWrap:"wrap"}}>
            <Kpi label="Tempo total" value={hms(agg.totalTime)} />
            <Kpi label="Média diária" value={hms(agg.avgTime)} />
          </View>
        </View>
      )}

      {/* Legenda das séries */}
      <View style={[styles.card, { marginBottom: 12 }]}>
        <Text style={styles.label}>Séries por dia</Text>
        <View style={{flexDirection:"row", gap:16, flexWrap:"wrap", marginTop:6}}>
          {["1º treino","2º treino","3º treino","4º treino"].map((t,i)=>(
            <View key={i} style={{flexDirection:"row", alignItems:"center", gap:6}}>
              <View style={{width:14,height:14, backgroundColor:SERIES_COLORS[i], borderRadius:3}} />
              <Text style={{color:"#ccc"}}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* “Todos”: estilo | % | aluno */}
      {!alunoId && (
        <View style={[styles.card, { marginBottom: 12 }]}>
          <Text style={styles.label}>Participação por aluno • estilo</Text>
          {participacao.length===0 && <Text style={{color:"#bbb"}}>Sem dados.</Text>}
          {participacao.map((p,i)=>(
            <Text key={i} style={{color:"#ccc", marginTop:4}}>
              {p.estilo} | {p.pct}% | {p.aluno}
            </Text>
          ))}
        </View>
      )}

      {/* Tabela */}
      <View style={[styles.card, { marginBottom: 12 }]}>
        <Text style={styles.label}>Atividades</Text>
        {/* Tabela baseada no filtro atual */}
        {(() => {
          const rows = [];
          (sessoes || []).forEach((s) => {
            (s.resultados || []).forEach((r) => {
              const b = (s.blocos || []).find((x) => x.id === r.blocoId);
              if (!b) return;
              if (alunoId && r.alunoId !== alunoId) return;
              if (estilo && estilo !== "todos" && b.estilo !== estilo) return;
              rows.push({
                data: s.dataBR,
                estilo: b.estilo,
                metros: Number(r.metros || 0),
                tempo: Number(r.tempo || 0),
                aluno: (alunos.find(a=>a.id===r.alunoId)?.nome)||r.alunoId
              });
            });
          });
          if(rows.length===0) return <Text style={{color:"#bbb"}}>Sem dados.</Text>;
          return rows.map((x,i)=>(
            <Text key={i} style={{color:"#ccc", marginTop:4}}>
              {pad2(i+1)} • {x.data} • {x.estilo} • {x.metros}m • {mmss(x.tempo)} • { (x.metros>0 && x.tempo>0)? pace100(x.metros, x.tempo): "--:--/100m"} • {x.aluno}
            </Text>
          ));
        })()}
      </View>
    </Screen>
  );
}

function MultiSeriesDailyChart({ days, series, yUnit="m", yFmt=(v)=>String(v), gridFromAvg=0, width=360, height=200, pad=28 }) {
  // series: [ [vDia1,...], [ ... ], ... ] até 4
  const W=width, H=height, P=pad, innerW=W-2*P, innerH=H-2*P;

  // max para escala
  const flat = series.flat();
  const maxVal = Math.max( ...flat, 0, gridFromAvg*1.5 ); // dá folga acima da média
  const avg = gridFromAvg || (flat.reduce((a,x)=>a+x,0)/(days.length||1));
  const step = Math.max(1, Math.ceil((avg/5) || (maxVal/5) || 1)); // linhas: média/5; fallback max/5
  const yLines = [1,2,3,4,5].map(i=>i*step);
  const scaleY = (v)=> P + innerH - ( (v/(yLines[4]||1)) * innerH );

  // X
  const xStep = days.length>1 ? innerW/(days.length-1) : 0;
  const xs = days.map((_,i)=> P + i*xStep);

  // path por série
  function pathFor(values){
    const pts = values.map((v,i)=>({x:xs[i], y: scaleY(v)}));
    const cmd = pts.map((p,i)=> i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`).join(" ");
    return { pts, cmd };
  }

  const colors = SERIES_COLORS;

  return (
    <Svg width={W} height={H}>
      {/* eixos */}
      <Path d={`M${P},${P} L${P},${H-P} L${W-P},${H-P}`} stroke="#333" strokeWidth="1"/>
      {/* grid horizontal 5 linhas */}
      {yLines.map((v,i)=>(
        <G key={i}>
          <SvgLine x1={P} y1={scaleY(v)} x2={W-P} y2={scaleY(v)} stroke="#222" strokeWidth="1" />
          <SvgText x={P-6} y={scaleY(v)-2} fill="#aaa" fontSize="10" textAnchor="end">{yFmt(v)}</SvgText>
        </G>
      ))}
      {/* bolinhas base X para dias */}
      {xs.map((x,i)=>(
        <Circle key={i} cx={x} cy={H-P} r={3} fill="#555"/>
      ))}
      {/* rótulos X: mostrar 7/15/30/1a compacto */}
      {days.map((d,i)=>(
        <SvgText key={i} x={xs[i]} y={H-P+12} fill="#888" fontSize="9" textAnchor="middle">{d.label}</SvgText>
      ))}

      {/* séries */}
      {series.map((vals,idx)=>{
        const { pts, cmd } = pathFor(vals);
        return (
          <G key={idx}>
            <Path d={cmd} stroke={colors[idx]} strokeWidth="2" fill="none"/>
            {pts.map((p,i)=> vals[i]>0 ? <Circle key={i} cx={p.x} cy={p.y} r={2.8} fill={colors[idx]} /> : null)}
          </G>
        );
      })}
    </Svg>
  );
}

function Kpi({ label, value }) {
  return (
    <View style={{ padding: 12, borderWidth: 1, borderColor: "#333", borderRadius: 12, minWidth: 130 }}>
      <Text style={{ color: "#aaa", fontSize: 12 }}>{label}</Text>
      <Text style={{ color: C.fg, fontSize: 18, fontWeight: "800", marginTop: 4 }}>{value}</Text>
    </View>
  );
}

/* ===== Root ===== */
export default function App() {
  const [route, setRoute] = useState("menu");
  useEffect(() => {
    const onBack = () => { if (route !== "menu") { setRoute("menu"); return true; } return false; };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [route]);
  useEffect(() => { const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 1200); return () => clearTimeout(t); }, []);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={route === "menu" ? "Sra Gru Swim" : route === "prof" ? "Professor" : route === "alunos" ? "Alunos" : route === "usuarios" ? "Usuários" : route === "train" ? "Sessão do Dia" : route === "turmas" ? "Turmas" : route === "rel" ? "Relatórios" : "Sra Gru Swim"} />
      {route === "menu" && <MenuScreen goto={setRoute} />}
      {route === "prof" && <ProfessorScreen />}
      {route === "alunos" && <AlunosScreen />}
      {route === "usuarios" && <UsuariosScreen />}
      {route === "train" && <SessaoScreen />}
      {route === "turmas" && <TurmasScreen />}
      {route === "rel" && <RelatoriosScreen />}
      <StatusBar style="light" />
    </View>
  );
}

/* ===== Styles ===== */
const styles = StyleSheet.create({
  header: { backgroundColor: "#000", borderBottomColor: C.border, borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: C.fg, fontSize: 18, fontWeight: "700" },
  h2: { color: C.fg, fontSize: 20, fontWeight: "800", marginBottom: 12 },
  card: { backgroundColor: "#0A0A0A", borderColor: "#555", borderWidth: 1, borderRadius: 16, padding: 16 },
  label: { color: "#ccc", fontSize: 14, marginTop: 8, marginBottom: 6 },
  input: { color: C.fg, backgroundColor: "#0A0A0A", borderColor: "#555", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  primary: { backgroundColor: C.tz, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18 },
  secondary: { borderColor: C.tz, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18 },
  danger: { backgroundColor: "#D32F2F", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  choice: { minWidth: 110, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, alignItems: "center" },
  choiceText: { fontWeight: "700" },
  choiceSm: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  choiceTextSm: { fontWeight: "700", fontSize: 12 },
  menuBar: { position: "absolute", left: 16, right: 16, bottom: 24, backgroundColor: "#0A0A0A", borderColor: "#444", borderWidth: 1, borderRadius: 20, padding: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", elevation: 4 },
  menuIconBtn: { flex: 1, alignItems: "center", paddingVertical: 8, backgroundColor: "#101010", borderColor: "#333", borderWidth: 1, borderRadius: 14 },
  menuIcon: { width: 36, height: 36 },
});
