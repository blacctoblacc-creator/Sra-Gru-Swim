// app.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform, Keyboard,
  BackHandler, Dimensions
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const C = { bg:'#000000', fg:'#FFFFFF', tz:'#00C5C8', border:'#1f1f1f' };
SplashScreen.preventAutoHideAsync().catch(()=>{});

/* ===== Utils ===== */
const pad2 = (n)=>String(n).padStart(2,'0');
const mmss = (s)=>`${pad2(Math.floor(Math.max(0, s)/60))}:${pad2(Math.floor(Math.max(0, s)%60))}`;
const pace100 = (m, s)=>(!m || !s) ? '--:--/100m' : `${mmss((s/m)*100)}/100m`;
const norm = (s)=>String(s||'').trim().toLowerCase();
const san100 = (s)=>String(s ?? '').replace(/[\r\n]/g,' ').slice(0,100);

/* Máscaras BR */
const onlyDigits = (s)=>String(s||'').replace(/\D/g,'');
function formatHoraBR(v){
  const d = onlyDigits(v).slice(0,4);
  if(d.length <= 2) return d;
  return `${d.slice(0,2)}:${d.slice(2)}`;
}
function formatDataBR(v){
  const d = onlyDigits(v).slice(0,8);
  if(d.length <= 2) return d;
  if(d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`;
  return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`;
}
function nowBR(){
  const t = new Date();
  const dd = pad2(t.getDate());
  const mm = pad2(t.getMonth()+1);
  const yyyy = t.getFullYear();
  const hh = pad2(t.getHours());
  const min = pad2(t.getMinutes());
  return { dataBR:`${dd}/${mm}/${yyyy}`, horaBR:`${hh}:${min}` };
}
function brToIso(dataBR, horaBR){
  // dd/mm/yyyy + hh:mm -> yyyy-mm-dd hh:mm
  const d = onlyDigits(dataBR); // ddmmyyyy
  const h = onlyDigits(horaBR); // hhmm
  if(d.length!==8 || h.length<3) return '';
  const dd = d.slice(0,2), mm = d.slice(2,4), yyyy = d.slice(4);
  const hh = h.slice(0,2), min = h.slice(2,4)||'00';
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/* ===== Header ===== */
function Header({ title }) {
  return (
    <View style={styles.header}>
      <View style={{ flexDirection:'row', alignItems:'center' }}>
        <View style={{ width:8, height:8, borderRadius:4, backgroundColor:C.tz, marginRight:8 }} />
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <Image source={require('./assets/logo.png')} resizeMode="contain" style={{ height:32, width:140 }} />
    </View>
  );
}

/* ===== Screen (Opção A ativa) ===== */
const KB_OFFSET = 110;
function Screen({ children, scrollRef }) {
  return (
    <KeyboardAvoidingView
      style={{ flex:1, backgroundColor:C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={KB_OFFSET}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        style={{ flex:1 }}
        contentContainerStyle={{ paddingBottom:96 }}
      >
        <View style={{ maxWidth:900, width:'100%', alignSelf:'center', paddingHorizontal:16, paddingTop:16 }}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ===== MENU — centro com imagem e rodapé com ícones ===== */
function MenuScreen({ goto }){
  const W = Dimensions.get('window').width;
  const imgSize = Math.round(W * 0.5); // 50% da largura

  return (
    <View style={{ flex:1, backgroundColor:C.bg }}>
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <Image source={require('./assets/blacc.png')}
               style={{ width:imgSize, height:imgSize }}
               resizeMode="contain" />
      </View>

      <View style={styles.menuBar}>
        <TouchableOpacity onPress={()=>goto('prof')} style={styles.menuIconBtn}>
          <Image source={require('./assets/professor.png')} style={styles.menuIcon} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>goto('alunos')} style={styles.menuIconBtn}>
          <Image source={require('./assets/aluno.png')} style={styles.menuIcon} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>goto('turmas')} style={styles.menuIconBtn}>
          <Image source={require('./assets/turmas.png')} style={styles.menuIcon} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>goto('train')} style={styles.menuIconBtn}>
          <Image source={require('./assets/sessao.png')} style={styles.menuIcon} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>goto('rel')} style={styles.menuIconBtn}>
          <Image source={require('./assets/relatorios.png')} style={styles.menuIcon} resizeMode="contain" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ===== Professor ===== */
function ProfessorScreen(){
  const [nome, setNome] = useState('Professor Único');
  const [registro, setRegistro] = useState('CRP-0001');
  const [obs, setObs] = useState('');
  return (
    <Screen>
      <Text style={styles.h2}>Dados do professor</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Nome*</Text>
        <TextInput value={nome} onChangeText={setNome} placeholder="Nome" placeholderTextColor="#777" style={styles.input} />
        <Text style={styles.label}>Registro*</Text>
        <TextInput value={registro} onChangeText={setRegistro} placeholder="Registro" placeholderTextColor="#777" style={styles.input} />
        <Text style={styles.label}>Observação</Text>
        <TextInput value={obs} onChangeText={setObs} placeholder="Notas" placeholderTextColor="#777" style={[styles.input, { height:100, textAlignVertical:'top' }]} multiline />
        <View style={{ flexDirection:'row', gap:12, marginTop:12 }}>
          <TouchableOpacity style={styles.primary}><Text style={{ color:'#000', fontWeight:'700' }}>Salvar</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>Limpar</Text></TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

/* ===== Storage & Constantes ===== */
const ALUNOS_KEY = 'ALUNOS_V1';
const USERS_KEY = 'USUARIOS_V1';
const TURMAS_KEY = 'TURMAS_V1';
const SESSOES_KEY = 'SESSOES_V2';
const HABILIDADES = ['iniciante','intermediário','avançado','profissional','competidor'];
const ESTILOS = ['crawl','costas','peito','borboleta'];
const CONJUNTO = ['braços unilateral','braços alternados','pernas','completo'];
const APARELHOS = ['nenhum','macarrão','pé de pato','paraquedas','flutuador','prancha','palmar','bolinha','outro'];

/* ===== Alunos (Aprovado) ===== */
function AlunosScreen({ guardRef }){
  const [list, setList] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [nome, setNome] = useState('');
  const [inscricao, setInscricao] = useState('');
  const [tipo, setTipo] = useState('aluno'); // aluno | personal | novato
  const [instituicao, setInstituicao] = useState('');
  const [habilidade, setHabilidade] = useState('iniciante');
  const [quadroClinico, setQuadroClinico] = useState('');
  const [obs, setObs] = useState('');

  const snapRef = useRef(null);
  const inscRef = useRef(null);
  const scRef = useRef(null);

  useEffect(()=>{(async()=>{const raw=await AsyncStorage.getItem(ALUNOS_KEY); if(raw) setList(JSON.parse(raw));})().catch(()=>{});},[]);
  async function persist(next){ setList(next); try{ await AsyncStorage.setItem(ALUNOS_KEY, JSON.stringify(next)); }catch{} }

  function baseSnapshot(){
    return { id: editingId||'new', nome:nome.trim(), inscricao:inscricao.trim(), tipo,
      instituicao:instituicao.trim(), habilidade, quadroClinico:quadroClinico.trim(), obs:obs.trim() };
  }
  function reset(){
    setEditingId(null); setNome(''); setInscricao(''); setTipo('aluno'); setInstituicao('');
    setHabilidade('iniciante'); setQuadroClinico(''); setObs('');
    snapRef.current = { id:'new', nome:'', inscricao:'', tipo:'aluno', instituicao:'', habilidade:'iniciante', quadroClinico:'', obs:'' };
  }
  function loadToForm(a){
    const tipoFixed = a.tipo==='experimental' ? 'novato' : a.tipo;
    setEditingId(a.id);
    setNome(a.nome); setInscricao(a.inscricao); setTipo(tipoFixed);
    setInstituicao(a.instituicao); setHabilidade(a.habilidade);
    setQuadroClinico(a.quadroClinico || ''); setObs(a.obs||'');
    snapRef.current = { id:a.id, nome:a.nome, inscricao:a.inscricao, tipo:tipoFixed, instituicao:a.instituicao,
      habilidade:a.habilidade, quadroClinico:a.quadroClinico || '', obs:a.obs||'' };
  }
  function isDirty(){ return JSON.stringify(baseSnapshot()) !== JSON.stringify(snapRef.current||{}); }

  function consultByNome(){
    const q = norm(nome);
    if(!q){ inscRef.current?.focus(); return; }
    const match = list.find(a=>norm(a.nome)===q);
    if(match){ loadToForm(match); } else { inscRef.current?.focus(); }
  }

  function validate(){
    const e=[]; if(!nome.trim()) e.push('Nome Social'); if(!inscricao.trim()) e.push('Inscrição');
    if(!instituicao.trim()) e.push('Instituição'); if(!tipo) e.push('Tipo');
    if(e.length){ Alert.alert('Campos obrigatórios', e.join(', ')); return false; }
    return true;
  }
  function onSave(){
    if(!validate()) return;
    const target = editingId ? list.find(a=>a.id===editingId) : list.find(a=>norm(a.inscricao)===norm(inscricao));
    const id = target ? target.id : String(Date.now());
    const createdAt = target ? target.createdAt : Date.now();
    const payload = {
      id, nome: nome.trim(), inscricao: inscricao.trim().slice(0,10), tipo,
      instituicao: instituicao.trim(), habilidade,
      quadroClinico: san100(quadroClinico), obs: san100(obs),
      createdAt, updatedAt: Date.now()
    };
    const next = target ? list.map(a=>a.id===id?payload:a) : [payload, ...list];
    persist(next); reset();
  }

  useEffect(()=>{
    if(!guardRef) return;
    guardRef.current = { hasChanges: ()=>isDirty(), save: ()=>onSave(), discard: ()=>reset() };
    return ()=>{ if(guardRef.current){ guardRef.current = { hasChanges:()=>false, save:()=>{}, discard:()=>{} }; } };
  }, [guardRef, nome, inscricao, tipo, instituicao, habilidade, quadroClinico, obs, editingId, list]);

  useEffect(()=>{ reset(); },[]);
  const scToEnd = ()=> setTimeout(()=> scRef.current?.scrollToEnd({animated:true}), 50);

  return (
    <Screen scrollRef={scRef}>
      <View style={styles.card}>
        <View style={{ flexDirection:'row', gap:8 }}>
          <View style={{ flex:1 }}>
            <Text style={styles.label}>Nome Social*</Text>
            <TextInput
              value={nome} onChangeText={setNome}
              placeholder="Nome Social" placeholderTextColor="#777"
              style={styles.input} returnKeyType="next" onSubmitEditing={consultByNome}
            />
          </View>
          <View style={{ flex:1 }}>
            <Text style={styles.label}>Inscrição*</Text>
            <TextInput
              ref={inscRef} value={inscricao}
              onChangeText={(v)=>setInscricao(v.replace(/\s+/g,'').slice(0,10))}
              placeholder="Código (até 10)" placeholderTextColor="#777"
              style={styles.input} maxLength={10}
            />
          </View>
        </View>

        <Text style={styles.label}>Tipo*</Text>
        <View style={{ flexDirection:'row', gap:8 }}>
          {['aluno','personal','novato'].map(v=>(
            <TouchableOpacity key={v} onPress={()=>setTipo(v)}
              style={[styles.choice, {flex:1, minWidth:0}, tipo===v?{backgroundColor:C.tz}:{borderColor:C.tz}]}>
              <Text style={[styles.choiceText, tipo===v?{color:'#000'}:{color:C.tz}]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Instituição*</Text>
        <TextInput value={instituicao} onChangeText={setInstituicao}
          placeholder="Academia / Clube / Particular" placeholderTextColor="#777" style={styles.input}/>

        <Text style={styles.label}>Habilidade</Text>
        <View style={{ gap:8 }}>
          <View style={{ flexDirection:'row', gap:8 }}>
            {HABILIDADES.slice(0,3).map(v=>(
              <TouchableOpacity key={v} onPress={()=>setHabilidade(v)}
                style={[styles.choiceSm, {flex:1}, habilidade===v?{backgroundColor:C.tz}:{borderColor:C.tz}]}>
                <Text style={[styles.choiceTextSm, habilidade===v?{color:'#000'}:{color:C.tz}]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection:'row', gap:8 }}>
            {HABILIDADES.slice(3).map(v=>(
              <TouchableOpacity key={v} onPress={()=>setHabilidade(v)}
                style={[styles.choiceSm, {flex:1}, habilidade===v?{backgroundColor:C.tz}:{borderColor:C.tz}]}>
                <Text style={[styles.choiceTextSm, habilidade===v?{color:'#000'}:{color:C.tz}]}>{v}</Text>
              </TouchableOpacity>
            ))}
            <View style={{flex:1}} />
          </View>
        </View>

        <Text style={styles.label}>Quadro Clínico</Text>
        <TextInput
          value={quadroClinico} onChangeText={(v)=>setQuadroClinico(san100(v))}
          placeholder="Descreva em até 100 caracteres" placeholderTextColor="#777"
          style={[styles.input, { minHeight:80, textAlignVertical:'top' }]}
          multiline maxLength={100}
        />

        <Text style={styles.label}>Observação</Text>
        <TextInput
          value={obs} onChangeText={(v)=>setObs(san100(v))}
          placeholder="Até 100 caracteres" placeholderTextColor="#777"
          style={[styles.input,{ minHeight:100, textAlignVertical:'top' }]}
          multiline maxLength={100}
        />

        <View style={{ flexDirection:'row', gap:12, marginTop:12 }}>
          <TouchableOpacity onPress={onSave} style={styles.primary}><Text style={{ color:'#000', fontWeight:'700' }}>{editingId?'Atualizar':'Salvar'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={reset} style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>Limpar</Text></TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

/* ===== Usuários ===== */
const PERFIS = ['treinador','assistente','admin'];
function UsuariosScreen(){
  const [list, setList] = useState([]); const [search, setSearch] = useState(''); const [editingId, setEditingId] = useState(null);
  const [nome, setNome] = useState(''); const [email, setEmail] = useState(''); const [perfil, setPerfil] = useState('treinador'); const [ativo, setAtivo] = useState(true);

  useEffect(()=>{(async()=>{const raw=await AsyncStorage.getItem(USERS_KEY); if(raw) setList(JSON.parse(raw));})().catch(()=>{});},[]);
  async function persist(next){ setList(next); try{ await AsyncStorage.setItem(USERS_KEY, JSON.stringify(next)); }catch{} }
  function reset(){ setEditingId(null); setNome(''); setEmail(''); setPerfil('treinador'); setAtivo(true); }
  function validate(){ const e=[]; if(!nome.trim())e.push('Nome'); if(!email.trim()||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))e.push('E-mail válido'); if(e.length){Alert.alert('Campos obrigatórios',e.join(', ')); return false;} const dup=list.find(u=>u.email.toLowerCase()===email.toLowerCase()&&u.id!==editingId); if(dup){Alert.alert('E-mail já cadastrado'); return false;} return true; }
  function onSave(){ if(!validate())return; const target= editingId? list.find(u=>u.id===editingId): list.find(u=>u.email.toLowerCase()===email.toLowerCase()); const id=target?target.id:String(Date.now()); const createdAt=target?target.createdAt:Date.now(); const payload={id,nome:nome.trim(),email:email.trim(),perfil,ativo,createdAt,updatedAt:Date.now()}; const next=target? list.map(u=>u.id===id?payload:u):[payload,...list]; persist(next); reset(); }
  function onEdit(u){ setEditingId(u.id); setNome(u.nome); setEmail(u.email); setPerfil(u.perfil); setAtivo(u.ativo); }
  function onDelete(id){ Alert.alert('Excluir usuário','Confirma excluir?',[{text:'Cancelar',style:'cancel'},{text:'Excluir',style:'destructive',onPress:()=>persist(list.filter(u=>u.id!==id))}]); }
  const filtered=list.filter(u=>{const q=search.trim().toLowerCase(); if(!q)return true; return u.nome.toLowerCase().includes(q)||u.email.toLowerCase().includes(q);});

  return (
    <Screen>
      <Text style={styles.h2}>Usuários — incluir, alterar, excluir, consultar</Text>
      <View style={[styles.card,{ marginBottom:12 }]}>
        <Text style={styles.label}>Consultar</Text><TextInput value={search} onChangeText={setSearch} placeholder="Nome ou e-mail" placeholderTextColor="#777" style={styles.input}/>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Nome*</Text><TextInput value={nome} onChangeText={setNome} placeholder="Nome" placeholderTextColor="#777" style={styles.input}/>
        <Text style={styles.label}>E-mail*</Text><TextInput value={email} onChangeText={setEmail} placeholder="email@dominio.com" placeholderTextColor="#777" keyboardType="email-address" autoCapitalize="none" style={styles.input}/>
        <Text style={styles.label}>Perfil</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
          {PERFIS.map(v=>(
            <TouchableOpacity key={v} onPress={()=>setPerfil(v)} style={[styles.choiceSm, perfil===v?{backgroundColor:C.tz}:{borderColor:C.tz}]}>
              <Text style={[styles.choiceTextSm, perfil===v?{color:'#000'}:{color:C.tz}]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Status</Text>
        <View style={{ flexDirection:'row', gap:8 }}>
          {['ativo','inativo'].map(v=>{const on=(v==='ativo')===ativo; return (
            <TouchableOpacity key={v} onPress={()=>setAtivo(v==='ativo')} style={[styles.choice, on?{backgroundColor:C.tz}:{borderColor:C.tz}]}>
              <Text style={[styles.choiceText, on?{color:'#000'}:{color:C.tz}]}>{v}</Text>
            </TouchableOpacity>
          );})}
        </View>
        <View style={{ flexDirection:'row', gap:12, marginTop:12 }}>
          <TouchableOpacity onPress={onSave} style={styles.primary}><Text style={{ color:'#000', fontWeight:'700' }}>{editingId?'Atualizar':'Salvar'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={reset} style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>Limpar</Text></TouchableOpacity>
        </View>
      </View>
      <View style={[styles.card,{ marginTop:12 }]}>
        {filtered.length===0 && <Text style={{ color:'#bbb' }}>Nenhum usuário.</Text>}
        {filtered.map(u=>(
          <View key={u.id} style={{ paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#222' }}>
            <Text style={{ color:C.fg, fontWeight:'700' }}>{u.nome}  <Text style={{ color:'#999' }}>({u.email})</Text></Text>
            <Text style={{ color:'#aaa', fontSize:12 }}>{u.perfil} • {u.ativo? 'ativo':'inativo'}</Text>
            <View style={{ flexDirection:'row', gap:10, marginTop:6 }}>
              <TouchableOpacity onPress={()=>onEdit(u)} style={[styles.secondary,{ paddingVertical:6, paddingHorizontal:12 }]}><Text style={{ color:C.tz, fontWeight:'700' }}>Editar</Text></TouchableOpacity>
              <TouchableOpacity onPress={()=>onDelete(u.id)} style={[styles.danger,{ paddingVertical:6, paddingHorizontal:12 }]}><Text style={{ color:'#000', fontWeight:'700' }}>Excluir</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

/* ===== Turmas ===== */
function TurmasScreen(){
  const [list, setList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [nome, setNome] = useState('');
  const [prof, setProf] = useState('');
  const [obs, setObs] = useState('');

  useEffect(()=>{(async()=>{const raw=await AsyncStorage.getItem(TURMAS_KEY); if(raw) setList(JSON.parse(raw));})().catch(()=>{});},[]);
  async function persist(next){ setList(next); try{ await AsyncStorage.setItem(TURMAS_KEY, JSON.stringify(next)); }catch{} }
  function reset(){ setEditingId(null); setNome(''); setProf(''); setObs(''); }
  function onEdit(t){ setEditingId(t.id); setNome(t.nome); setProf(t.prof); setObs(t.obs||''); }
  function onDelete(id){ Alert.alert('Excluir turma','Confirma?',[{text:'Cancelar',style:'cancel'},{text:'Excluir',style:'destructive',onPress:()=>persist(list.filter(t=>t.id!==id))}]); }
  function onSave(){
    if(!nome.trim() || !prof.trim()){ Alert.alert('Campos obrigatórios','Nome da turma e Professor'); return; }
    const target = editingId ? list.find(t=>t.id===editingId) : null;
    const id = target ? target.id : String(Date.now());
    const createdAt = target ? target.createdAt : Date.now();
    const payload = { id, nome:nome.trim(), prof:prof.trim(), obs:san100(obs), createdAt, updatedAt:Date.now() };
    const next = target ? list.map(t=>t.id===id?payload:t) : [payload, ...list];
    persist(next); reset();
  }

  return (
    <Screen>
      <Text style={styles.h2}>Turmas</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Nome da turma*</Text>
        <TextInput value={nome} onChangeText={setNome} placeholder="Ex.: Infantil A" placeholderTextColor="#777" style={styles.input}/>
        <Text style={styles.label}>Professor*</Text>
        <TextInput value={prof} onChangeText={setProf} placeholder="Nome do professor" placeholderTextColor="#777" style={styles.input}/>
        <Text style={styles.label}>Observação</Text>
        <TextInput value={obs} onChangeText={(v)=>setObs(san100(v))} placeholder="Até 100 caracteres" placeholderTextColor="#777" style={[styles.input,{minHeight:80,textAlignVertical:'top'}]} multiline maxLength={100}/>
        <View style={{ flexDirection:'row', gap:12, marginTop:12 }}>
          <TouchableOpacity onPress={onSave} style={styles.primary}><Text style={{ color:'#000', fontWeight:'700' }}>{editingId?'Atualizar':'Salvar'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={reset} style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>Limpar</Text></TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card,{ marginTop:12 }]}>
        {list.length===0 && <Text style={{ color:'#bbb' }}>Nenhuma turma.</Text>}
        {list.map(t=>(
          <View key={t.id} style={{ paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#222' }}>
            <Text style={{ color:C.fg, fontWeight:'700' }}>{t.nome}  <Text style={{ color:'#999' }}>({t.prof})</Text></Text>
            {!!t.obs && <Text style={{ color:'#aaa', fontSize:12 }}>{t.obs}</Text>}
            <View style={{ flexDirection:'row', gap:10, marginTop:6 }}>
              <TouchableOpacity onPress={()=>onEdit(t)} style={[styles.secondary,{ paddingVertical:6, paddingHorizontal:12 }]}><Text style={{ color:C.tz, fontWeight:'700' }}>Editar</Text></TouchableOpacity>
              <TouchableOpacity onPress={()=>onDelete(t.id)} style={[styles.danger,{ paddingVertical:6, paddingHorizontal:12 }]}><Text style={{ color:'#000', fontWeight:'700' }}>Excluir</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

/* ===== Sessão do Dia — HABILITADA com Data/Hora BR ===== */
function SessaoScreen(){
  const [alunos, setAlunos] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  useEffect(()=>{(async()=>{try{const a=await AsyncStorage.getItem(ALUNOS_KEY); if(a) setAlunos(JSON.parse(a));}catch{} try{const s=await AsyncStorage.getItem(SESSOES_KEY); if(s) setSessoes(JSON.parse(s));}catch{}})();},[]);
  async function persist(next){ setSessoes(next); try{ await AsyncStorage.setItem(SESSOES_KEY, JSON.stringify(next)); }catch{} }

  // sessão
  const [mode, setMode] = useState('grupo'); // 'individual' | 'grupo'
  const [selIds, setSelIds] = useState([]); // alunos selecionados
  const [piscina, setPiscina] = useState(25);

  const { dataBR: d0, horaBR: h0 } = nowBR();
  const [dataBR, setDataBR] = useState(d0);   // dd/mm/yyyy
  const [horaBR, setHoraBR] = useState(h0);   // hh:mm

  const [sessId, setSessId] = useState(null);
  const sessionStartRef = useRef(null); // ts início real

  // busca alunos
  const [qAluno, setQAluno] = useState('');
  const alunosFiltrados = useMemo(()=>alunos.filter(a=>{
    const q=qAluno.trim().toLowerCase(); if(!q) return true;
    return a.nome.toLowerCase().includes(q)||a.inscricao.toLowerCase().includes(q);
  }),[alunos,qAluno]);

  // blocos
  const [blocks, setBlocks] = useState([]);
  const [activeBlockId, setActiveBlockId] = useState(null);

  // estado por aluno no bloco ativo
  const [row, setRow] = useState({}); // alunoId -> {meters, min, sec, nota, obs, running, startTs, elapsed, startRel}
  const tickRef = useRef(null);

  // resultados
  const [results, setResults] = useState([]); // {blocoId, alunoId, metros, tempo, pace, nota, obs, inicio}

  function resetState(){
    setMode('grupo'); setSelIds([]); setPiscina(25);
    setBlocks([]); setActiveBlockId(null); setRow({}); setResults([]); setSessId(null);
    const n = nowBR(); setDataBR(n.dataBR); setHoraBR(n.horaBR);
    stopTick();
  }

  function startTick(){
    if(tickRef.current) return;
    tickRef.current = setInterval(()=>{
      setRow(prev=>{
        const now=Date.now();
        const next={...prev};
        Object.keys(next).forEach(id=>{
          if(next[id].running){
            next[id]={...next[id], elapsed: Math.max(0, Math.floor((now - next[id].startTs)/1000) + (next[id].baseElapsed||0))};
          }
        });
        return next;
      });
    }, 500);
  }
  function stopTick(){ if(tickRef.current){ clearInterval(tickRef.current); tickRef.current=null; } }

  function ensureSessionStart(){ if(!sessionStartRef.current) sessionStartRef.current = Date.now(); }

  // blocos
  function addBlock(data){
    const b={ id:`b${Date.now()}`, estilo:data.estilo||'crawl', conjunto:data.conjunto||'completo', aparelho:data.aparelho||'nenhum', metros: Number(data.metros||200), reps: Number(data.reps||1) };
    setBlocks([b, ...blocks]);
  }
  function dupBlock(b){ const c={...b, id:`b${Date.now()}`}; setBlocks([c, ...blocks]); }
  function delBlock(id){
    if(activeBlockId===id){ setActiveBlockId(null); setRow({}); stopTick(); }
    setBlocks(blocks.filter(b=>b.id!==id));
    setResults(results.filter(r=>r.blocoId!==id));
  }
  function startBlock(b){
    setActiveBlockId(b.id);
    ensureSessionStart();
    const base={}; selIds.forEach(id=>{
      base[id]={ meters:b.metros, min:'', sec:'', nota:7, obs:'', running:false, baseElapsed:0, elapsed:0, startTs:null, startRel:null };
    });
    setRow(base);
  }

  // seleção participantes
  function toggleSel(id){ if(mode==='individual'){ setSelIds([id]); return; } setSelIds(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]); }
  function selectAll(){ if(mode==='grupo') setSelIds(alunosFiltrados.map(a=>a.id)); }
  function clearSel(){ setSelIds([]); }

  // controle por aluno
  function startAluno(id){
    if(!activeBlockId){ Alert.alert('Defina e inicie um bloco primeiro.'); return; }
    ensureSessionStart(); startTick();
    setRow(prev=>{
      const r=prev[id]||{meters:200,min:'',sec:'',nota:7,obs:'',baseElapsed:0,elapsed:0};
      return {...prev, [id]:{...r, running:true, startTs:Date.now(), startRel: r.startRel ?? Math.floor((Date.now()-sessionStartRef.current)/1000)}};
    });
  }
  function stopAluno(id){
    setRow(prev=>{
      const r=prev[id]; if(!r) return prev;
      const now=Date.now();
      const elapsed = Math.max(0, Math.floor((now - (r.startTs||now))/1000) + (r.baseElapsed||0));
      return {...prev, [id]:{...r, running:false, baseElapsed:elapsed, elapsed, startTs:null}};
    });
    setTimeout(()=>{ setRow(p=>{ const any = Object.values(p).some(v=>v.running); if(!any) stopTick(); return p; }); },10);
  }
  function startAll(){ selIds.forEach(startAluno); }
  function stopAll(){ selIds.forEach(stopAluno); }

  function adjustTime(id, delta){
    setRow(prev=>{
      const r=prev[id]; if(!r) return prev;
      const base = Math.max(0, (r.running? r.elapsed : r.baseElapsed||0) + delta);
      return {...prev, [id]:{...r, baseElapsed:base, elapsed:base}};
    });
  }
  function concludeAluno(id){
    const r = row[id]; if(!r){ return; }
    const total = r.min || r.sec ? (parseInt(r.min||'0',10)*60 + parseInt(r.sec||'0',10)) : (r.running ? r.elapsed : (r.baseElapsed||0));
    if(!total){ Alert.alert('Informe/registre o tempo.'); return; }
    const bloco = blocks.find(b=>b.id===activeBlockId); if(!bloco){ Alert.alert('Bloco inválido.'); return; }
    const payload = {
      blocoId: activeBlockId, alunoId:id, metros:Number(r.meters||bloco.metros),
      tempo: total, pace: pace100(Number(r.meters||bloco.metros), total),
      nota: r.nota||7, obs: r.obs||'', inicio: r.startRel ?? 0
    };
    setResults([payload, ...results]);
    setRow(prev=>({...prev, [id]:{...prev[id], running:false, baseElapsed:0, elapsed:0, min:'', sec:'', obs:'', startTs:null, startRel:null}}));
  }
  function saveSessao(){
    if(selIds.length===0){ Alert.alert('Selecione ao menos 1 aluno.'); return; }
    if(blocks.length===0){ Alert.alert('Adicione ao menos 1 bloco.'); return; }
    const dataIso = brToIso(dataBR, horaBR);
    const payload = {
      id: sessId ?? `sess-${Date.now()}`,
      participantes: selIds, piscina,
      dataBR, horaBR, dataIso, // BR visível + ISO auxiliar
      blocos: blocks, resultados: results,
      createdAt: sessId ? (sessoes.find(s=>s.id===sessId)?.createdAt) : Date.now(), updatedAt: Date.now(),
    };
    const next = sessId ? sessoes.map(s=>s.id===payload.id? payload:s) : [payload, ...sessoes];
    setSessoes(next); persist(next); setSessId(payload.id); Alert.alert('Sessão salva');
  }
  function newSessao(){ resetState(); }

  const activeBlock = blocks.find(b=>b.id===activeBlockId);

  return (
    <Screen>
      <Text style={styles.h2}>Sessão do Dia — Individual / Grupo</Text>

      {/* Modo + Participantes */}
      <View style={[styles.card,{marginBottom:12}]}>
        <Text style={styles.label}>Modo</Text>
        <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
          {['individual','grupo'].map(m=>(
            <TouchableOpacity key={m} onPress={()=>{setMode(m); if(m==='individual' && selIds.length>1) setSelIds(selIds.slice(0,1));}} style={[styles.choice, mode===m?{backgroundColor:C.tz}:{borderColor:C.tz}]}>
              <Text style={[styles.choiceText, mode===m?{color:'#000'}:{color:C.tz}]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Participantes</Text>
        <TextInput value={qAluno} onChangeText={setQAluno} placeholder="Buscar aluno (nome/inscrição)" placeholderTextColor="#777" style={styles.input}/>
        <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
          {mode==='grupo' && <TouchableOpacity onPress={selectAll} style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>Selecionar todos</Text></TouchableOpacity>}
          <TouchableOpacity onPress={clearSel} style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>Limpar seleção</Text></TouchableOpacity>
        </View>
        <View style={{ maxHeight:160, marginTop:8 }}>
          <ScrollView>
            {alunosFiltrados.map(a=>{
              const on = selIds.includes(a.id);
              return (
                <TouchableOpacity key={a.id} onPress={()=>toggleSel(a.id)} style={{ paddingVertical:6 }}>
                  <Text style={{ color: on? C.tz : C.fg }}>{on?'✓ ':''}{a.nome} <Text style={{ color:'#999' }}>({a.inscricao})</Text></Text>
                </TouchableOpacity>
              );
            })}
            {alunosFiltrados.length===0 && <Text style={{ color:'#777' }}>Nenhum aluno encontrado.</Text>}
          </ScrollView>
        </View>

        {/* Data e Hora BR lado a lado */}
        <View style={{ flexDirection:'row', gap:8, marginTop:12, alignItems:'flex-end' }}>
          <View style={{ flex:1 }}>
            <Text style={styles.label}>Data (dd/mm/aaaa)</Text>
            <TextInput
              value={dataBR}
              onChangeText={(v)=>setDataBR(formatDataBR(v))}
              maxLength={10}
              keyboardType="number-pad"
              placeholder="dd/mm/aaaa"
              placeholderTextColor="#777"
              style={styles.input}
            />
          </View>
          <View style={{ width:140 }}>
            <Text style={styles.label}>Hora (hh:mm)</Text>
            <TextInput
              value={horaBR}
              onChangeText={(v)=>setHoraBR(formatHoraBR(v))}
              maxLength={5}
              keyboardType="number-pad"
              placeholder="hh:mm"
              placeholderTextColor="#777"
              style={styles.input}
            />
          </View>
          <View style={{ width:140 }}>
            <Text style={styles.label}>Piscina (10–50 m)</Text>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              <TouchableOpacity onPress={()=>setPiscina(p=>Math.max(10,p-1))} style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>-</Text></TouchableOpacity>
              <Text style={{ color:C.fg, minWidth:48, textAlign:'center' }}>{piscina} m</Text>
              <TouchableOpacity onPress={()=>setPiscina(p=>Math.min(50,p+1))} style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>+</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Fila de Blocos */}
      <View style={[styles.card,{marginBottom:12}]}>
        <Text style={styles.label}>Criar bloco</Text>
        <BlocoCreator onAdd={addBlock}/>
        <Text style={[styles.label,{marginTop:8}]}>Blocos</Text>
        {blocks.length===0 && <Text style={{ color:'#bbb' }}>Nenhum bloco.</Text>}
        {blocks.map(b=>(
          <View key={b.id} style={{ paddingVertical:8, borderBottomColor:'#222', borderBottomWidth:1, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <Text style={{ color:C.fg }}>{b.estilo} • {b.conjunto} • {b.aparelho} • {b.metros}m {b.reps>1?`x${b.reps}`:''}</Text>
            <View style={{ flexDirection:'row', gap:8 }}>
              <TouchableOpacity onPress={()=>dupBlock(b)} style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>Duplicar</Text></TouchableOpacity>
              <TouchableOpacity onPress={()=>startBlock(b)} style={styles.primary}><Text style={{ color:'#000', fontWeight:'700' }}>Iniciar</Text></TouchableOpacity>
              <TouchableOpacity onPress={()=>delBlock(b.id)} style={styles.danger}><Text style={{ color:'#000', fontWeight:'700' }}>Excluir</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Execução do bloco ativo */}
      {activeBlock &&
        <View style={[styles.card,{marginBottom:12}]}>
          <Text style={styles.label}>Bloco ativo: {activeBlock.estilo} • {activeBlock.conjunto} • {activeBlock.aparelho} • {activeBlock.metros}m</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:8 }}>
            <TouchableOpacity onPress={startAll} style={styles.primary}><Text style={{ color:'#000', fontWeight:'700' }}>Iniciar todos</Text></TouchableOpacity>
            <TouchableOpacity onPress={stopAll} style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>Parar todos</Text></TouchableOpacity>
          </View>

          {selIds.length===0 && <Text style={{ color:'#bbb' }}>Selecione participantes.</Text>}
          {selIds.map(id=>{
            const a = alunos.find(x=>x.id===id); const r = row[id] || {};
            const tempo = r.min || r.sec ? (parseInt(r.min||'0',10)*60 + parseInt(r.sec||'0',10)) : (r.elapsed||0);
            return (
              <View key={id} style={{ paddingVertical:8, borderBottomColor:'#222', borderBottomWidth:1 }}>
                <Text style={{ color:C.fg, fontWeight:'700' }}>{a? a.nome : id}</Text>
                <View style={{ flexDirection:'row', gap:8, alignItems:'center', marginTop:6, flexWrap:'wrap' }}>
                  <Text style={{ color:'#aaa' }}>Distância</Text>
                  <TextInput value={String(r.meters??activeBlock.metros)} onChangeText={(v)=>setRow(p=>({...p,[id]:{...(p[id]||{}), meters: v.replace(/[^0-9]/g,'')}}))} keyboardType="numeric" placeholderTextColor="#777" style={[styles.input,{width:90}]}/>
                  <Text style={{ color:'#aaa' }}>mm:ss</Text>
                  <TextInput value={r.min??''} onChangeText={(v)=>setRow(p=>({...p,[id]:{...(p[id]||{}), min:v.replace(/[^0-9]/g,'').slice(0,2)}}))} keyboardType="numeric" placeholder="mm" placeholderTextColor="#777" style={[styles.input,{width:70}]}/>
                  <TextInput value={r.sec??''} onChangeText={(v)=>setRow(p=>({...p,[id]:{...(p[id]||{}), sec:v.replace(/[^0-9]/g,'').slice(0,2)}}))} keyboardType="numeric" placeholder="ss" placeholderTextColor="#777" style={[styles.input,{width:70}]}/>
                  <Text style={{ color:'#aaa' }}>Tempo: <Text style={{ color:C.fg }}>{mmss(tempo)}</Text></Text>
                  <TouchableOpacity onPress={()=>adjustTime(id, -5)} style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>-5s</Text></TouchableOpacity>
                  <TouchableOpacity onPress={()=>adjustTime(id, 5)} style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>+5s</Text></TouchableOpacity>
                </View>

                <View style={{ flexDirection:'row', gap:8, marginTop:6, alignItems:'center', flexWrap:'wrap' }}>
                  <TouchableOpacity onPress={()=>startAluno(id)} style={styles.primary}><Text style={{ color:'#000', fontWeight:'700' }}>{r.running?'Reiniciar':'Start'}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={()=>stopAluno(id)} style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>Stop</Text></TouchableOpacity>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                    <Text style={{ color:'#aaa' }}>Nota</Text>
                    <View style={{ flexDirection:'row', gap:6 }}>
                      {Array.from({length:10},(_,i)=>i+1).map(v=>(
                        <TouchableOpacity key={v} onPress={()=>setRow(p=>({...p,[id]:{...(p[id]||{}), nota:v}}))} style={[styles.choiceSm, (r.nota||7)===v?{backgroundColor:C.tz}:{borderColor:C.tz}]}>
                          <Text style={[styles.choiceTextSm, (r.nota||7)===v?{color:'#000'}:{color:C.tz}]}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <TextInput value={r.obs??''} onChangeText={(v)=>setRow(p=>({...p,[id]:{...(p[id]||{}), obs:v}}))} placeholder="Observação" placeholderTextColor="#777" style={[styles.input,{ marginTop:6 }]} />
                <Text style={{ color:'#888', marginTop:4 }}>Ritmo: {pace100(Number(r.meters||activeBlock.metros), tempo)}</Text>

                <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
                  <TouchableOpacity onPress={()=>concludeAluno(id)} style={styles.primary}><Text style={{ color:'#000', fontWeight:'700' }}>✓ Concluir</Text></TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      }

      {/* Linha do tempo */}
      <View style={[styles.card,{marginBottom:12}]}>
        <Text style={styles.label}>Linha do tempo</Text>
        {results.length===0 && <Text style={{ color:'#bbb' }}>Sem resultados ainda.</Text>}
        {results.map((r,i)=>{
          const aluno = alunos.find(a=>a.id===r.alunoId);
          const blk = blocks.find(b=>b.id===r.blocoId);
          return (
            <View key={`${r.blocoId}-${r.alunoId}-${i}`} style={{ paddingVertical:6, borderBottomColor:'#222', borderBottomWidth:1 }}>
              <Text style={{ color:C.fg }}>{mmss(r.inicio||0)} — {aluno?aluno.nome:r.alunoId} — {blk?blk.estilo:''} — {r.metros}m — {mmss(r.tempo)} — {r.pace} — Nota {r.nota}</Text>
              {!!r.obs && <Text style={{ color:'#888', fontSize:12 }}>Obs: {r.obs}</Text>}
            </View>
          );
        })}
      </View>

      {/* Ações sessão */}
      <View style={{ flexDirection:'row', gap:12 }}>
        <TouchableOpacity onPress={saveSessao} style={styles.primary}><Text style={{ color:'#000', fontWeight:'700' }}>{sessId? 'Atualizar sessão' : 'Salvar sessão'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={newSessao} style={styles.secondary}><Text style={{ color:C.tz, fontWeight:'700' }}>Nova sessão</Text></TouchableOpacity>
      </View>
    </Screen>
  );
}

function BlocoCreator({ onAdd }){
  const [estilo, setEstilo] = useState('crawl');
  const [conjunto, setConjunto] = useState('completo');
  const [aparelho, setAparelho] = useState('nenhum');
  const [metros, setMetros] = useState('200');
  const [reps, setReps] = useState('1');
  function add(){ onAdd({estilo,conjunto,aparelho,metros:Number(metros||0),reps:Number(reps||1)}); }
  return (
    <View>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
        <PickerInline label="Estilo" data={ESTILOS} value={estilo} onChange={setEstilo}/>
        <PickerInline label="Conjunto" data={CONJUNTO} value={conjunto} onChange={setConjunto}/>
        <PickerInline label="Aparelho" data={APARELHOS} value={aparelho} onChange={setAparelho}/>
        <InlineField label="Distância (m)" value={metros} setValue={setMetros} width={110}/>
        <InlineField label="Reps" value={reps} setValue={setReps} width={90}/>
      </View>
      <View style={{ marginTop:8 }}>
        <TouchableOpacity onPress={add} style={styles.primary}><Text style={{ color:'#000', fontWeight:'700' }}>Adicionar bloco</Text></TouchableOpacity>
      </View>
    </View>
  );
}
function PickerInline({ label, data, value, onChange }){
  return (
    <View style={{ width:180 }}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection:'row', gap:8 }}>
          {data.map(v=>(
            <TouchableOpacity key={v} onPress={()=>onChange(v)} style={[styles.choiceSm, value===v?{backgroundColor:C.tz}:{borderColor:C.tz}]}>
              <Text style={[styles.choiceTextSm, value===v?{color:'#000'}:{color:C.tz}]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
function InlineField({ label, value, setValue, width=140 }){
  return (
    <View style={{ width }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={String(value)} onChangeText={setValue} placeholderTextColor="#777" style={styles.input} keyboardType="numeric"/>
    </View>
  );
}

/* ===== Root ===== */
export default function App(){
  const [route, _setRoute] = useState('menu');
  const alunosGuard = useRef({ hasChanges:()=>false, save:()=>{}, discard:()=>{} });

  // ESC/voltar: retorna ao menu
  useEffect(()=>{
    const onBack = ()=> {
      if(route!=='menu'){ _setRoute('menu'); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return ()=>sub.remove();
  }, [route]);

  useEffect(()=>{ const t=setTimeout(()=>SplashScreen.hideAsync().catch(()=>{}),3000); return ()=>clearTimeout(t); },[]);

  function trySetRoute(next){
    if(route==='alunos' && alunosGuard.current?.hasChanges()){
      Alert.alert(
        'Houve Alteração nas Informações do Aluno',
        'Deseja salvar?',
        [
          { text:'Não', style:'destructive', onPress:()=>{ alunosGuard.current.discard(); _setRoute(next); } },
          { text:'Sim', onPress:()=>{ alunosGuard.current.save(); _setRoute(next); } },
          { text:'Cancelar', style:'cancel' }
        ]
      );
    } else { _setRoute(next); }
  }

  return (
    <View style={{ flex:1, backgroundColor:C.bg }}>
      <Header title={
        route==='menu' ? 'Sra Gru Swim' :
        route==='prof' ? 'Professor' :
        route==='alunos' ? 'Alunos' :
        route==='usuarios' ? 'Usuários' :
        route==='train' ? 'Sessão do Dia' :
        route==='turmas' ? 'Turmas' :
        route==='rel' ? 'Relatórios' : 'Sra Gru Swim'
      }/>
      {route==='menu' && <MenuScreen goto={trySetRoute} />}
      {route==='prof' && <ProfessorScreen />}
      {route==='alunos' && <AlunosScreen guardRef={alunosGuard} />}
      {route==='usuarios' && <UsuariosScreen />}
      {route==='train' && <SessaoScreen />}
      {route==='turmas' && <TurmasScreen />}
      {route==='rel' && <Screen><Text style={{color:'#bbb'}}>Relatórios — em desenvolvimento.</Text></Screen>}
      <StatusBar style="light" />
    </View>
  );
}

/* ===== Styles ===== */
const styles = StyleSheet.create({
  header:{ backgroundColor:'#000', borderBottomColor:C.border, borderBottomWidth:1, paddingHorizontal:16, paddingVertical:12, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  headerTitle:{ color:C.fg, fontSize:18, fontWeight:'700' },

  h2:{ color:C.fg, fontSize:20, fontWeight:'800', marginBottom:12 },
  card:{ backgroundColor:'#0A0A0A', borderColor:'#555', borderWidth:1, borderRadius:16, padding:16 },
  label:{ color:'#ccc', fontSize:14, marginTop:8, marginBottom:6 },
  input:{ color:C.fg, backgroundColor:'#0A0A0A', borderColor:'#555', borderWidth:1, borderRadius:12, paddingHorizontal:12, paddingVertical:12 },
  primary:{ backgroundColor:C.tz, paddingHorizontal:18, paddingVertical:12, borderRadius:18 },
  secondary:{ borderColor:C.tz, borderWidth:1, paddingHorizontal:18, paddingVertical:12, borderRadius:18 },
  danger:{ backgroundColor:'#D32F2F', borderRadius:12, paddingHorizontal:12, paddingVertical:8 },
  choice:{ minWidth:110, paddingHorizontal:14, paddingVertical:10, borderRadius:16, borderWidth:1, alignItems:'center' },
  choiceText:{ fontWeight:'700' },
  choiceSm:{ paddingHorizontal:12, paddingVertical:8, borderRadius:14, borderWidth:1, alignItems:'center' },
  choiceTextSm:{ fontWeight:'700', fontSize:12 },

  menuBar:{
    position:'absolute', left:16, right:16, bottom:24,
    backgroundColor:'#0A0A0A', borderColor:'#444', borderWidth:1, borderRadius:20,
    padding:10, flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    elevation:4,
  },
  menuIconBtn:{ flex:1, alignItems:'center', paddingVertical:8, backgroundColor:'#101010', borderColor:'#333', borderWidth:1, borderRadius:14 },
  menuIcon:{ width:36, height:36 },
});
