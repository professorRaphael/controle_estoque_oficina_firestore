import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "./src/firebase";
import { calcularNovoSaldo } from "./src/domain/estoque";

type Produto = {
  id: string;
  nome: string;
  quantidade: number;
  minimo: number;
};

type Movimento = {
  id: string;
  produtoNome: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  usuario: string;
  quando?: Timestamp;
};

const produtosRef = collection(db, "produtos");
const movimentosRef = collection(db, "movimentacoes");

function parseInteiro(texto: string): number | null {
  const valor = Number(texto.trim());
  return /^\d+$/.test(texto.trim()) && Number.isSafeInteger(valor)
    ? valor
    : null;
}

export default function App() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [verificando, setVerificando] = useState(true);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [nome, setNome] = useState("");
  const [minimo, setMinimo] = useState("2");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [erroLeitura, setErroLeitura] = useState("");

  useEffect(
    () =>
      onAuthStateChanged(auth, (pessoa) => {
        setUsuario(pessoa);
        setVerificando(false);
      }),
    [],
  );

  useEffect(() => {
    if (!usuario) {
      setProdutos([]);
      setMovimentos([]);
      return;
    }
    setErroLeitura("");
    const cancelarProdutos = onSnapshot(
      produtosRef,
      (snapshot) => {
        setProdutos(
          snapshot.docs
            .map((item) => ({
              id: item.id,
              nome: String(item.data().nome),
              quantidade: Number(item.data().quantidade),
              minimo: Number(item.data().minimo),
            }))
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
        );
      },
      () =>
        setErroLeitura(
          "Não foi possível ler os produtos. Confira as regras do Firestore.",
        ),
    );

    const consulta = query(movimentosRef, orderBy("quando", "desc"), limit(8));
    const cancelarMovimentos = onSnapshot(
      consulta,
      (snapshot) => {
        setMovimentos(
          snapshot.docs.map((item) => ({
            id: item.id,
            produtoNome: String(item.data().produtoNome),
            tipo: item.data().tipo as "entrada" | "saida",
            quantidade: Number(item.data().quantidade),
            usuario: String(item.data().usuario),
            quando: item.data().quando as Timestamp | undefined,
          })),
        );
      },
      () =>
        setErroLeitura(
          "Não foi possível ler o histórico. Confira as regras do Firestore.",
        ),
    );

    return () => {
      cancelarProdutos();
      cancelarMovimentos();
    };
  }, [usuario]);

  const alertas = useMemo(
    () => produtos.filter((item) => item.quantidade <= item.minimo).length,
    [produtos],
  );

  async function entrar() {
    if (!email.trim() || !senha)
      return Alert.alert("Atenção", "Informe e-mail e senha.");
    setOcupado(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      setSenha("");
    } catch {
      Alert.alert(
        "Não foi possível entrar",
        "Confira as credenciais e a configuração do Firebase.",
      );
    } finally {
      setOcupado(false);
    }
  }

  async function cadastrar() {
    const nomeLimpo = nome.trim();
    const estoqueMinimo = parseInteiro(minimo);
    if (
      nomeLimpo.length < 2 ||
      nomeLimpo.length > 70 ||
      estoqueMinimo === null ||
      estoqueMinimo > 100_000
    ) {
      return Alert.alert(
        "Dados inválidos",
        "Informe um nome (2–70 caracteres) e mínimo de 0 a 100000.",
      );
    }
    setOcupado(true);
    try {
      await addDoc(produtosRef, {
        nome: nomeLimpo,
        quantidade: 0,
        minimo: estoqueMinimo,
        atualizadoEm: serverTimestamp(),
      });
      setNome("");
      setMinimo("2");
    } catch {
      Alert.alert(
        "Erro",
        "Não foi possível cadastrar. Confira a conexão e as regras.",
      );
    } finally {
      setOcupado(false);
    }
  }

  async function movimentar(produto: Produto, tipo: "entrada" | "saida") {
    if (ocupado || !usuario) return;
    setOcupado(true);
    try {
      const produtoRef = doc(db, "produtos", produto.id);
      const movimentoRef = doc(movimentosRef);
      await runTransaction(db, async (tx) => {
        const atual = await tx.get(produtoRef);
        if (!atual.exists()) throw new Error("Produto não encontrado.");
        const quantidade = 1; // Movimento didático de uma unidade por toque.
        const novoSaldo = calcularNovoSaldo(
          Number(atual.data().quantidade),
          quantidade,
          tipo,
        );
        tx.update(produtoRef, {
          quantidade: novoSaldo,
          atualizadoEm: serverTimestamp(),
        });
        tx.set(movimentoRef, {
          produtoId: produto.id,
          produtoNome: String(atual.data().nome),
          tipo,
          quantidade,
          saldoApos: novoSaldo,
          usuario: usuario.uid,
          quando: serverTimestamp(),
        });
      });
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Falha ao movimentar o estoque.";
      Alert.alert("Movimentação não realizada", mensagem);
    } finally {
      setOcupado(false);
    }
  }

  if (verificando)
    return (
      <SafeAreaView style={s.centro}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );

  if (!usuario)
    return (
      <SafeAreaView style={s.tela}>
        <View style={s.login}>
          <Text style={s.titulo}>Estoque da Oficina</Text>
          <Text style={s.subtitulo}>
            Firestore • login das contas criadas pelo professor
          </Text>
          <TextInput
            style={s.campo}
            placeholder="E-mail"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={s.campo}
            placeholder="Senha"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
          />
          <Botao titulo="Entrar" onPress={entrar} disabled={ocupado} />
          <Text style={s.dica}>
            As contas são cadastradas no console Firebase. Este aplicativo não
            cria usuários.
          </Text>
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={s.tela}>
      <ScrollView
        contentContainerStyle={s.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.titulo}>Estoque compartilhado</Text>
        <Text style={s.subtitulo}>
          {usuario.email} · {produtos.length} produtos · {alertas} em atenção
        </Text>
        {erroLeitura ? <Text style={s.erro}>{erroLeitura}</Text> : null}
        <View style={s.cartao}>
          <Text style={s.secao}>Cadastrar peça</Text>
          <TextInput
            style={s.campo}
            placeholder="Ex.: Filtro de óleo"
            placeholderTextColor="#64748b"
            value={nome}
            onChangeText={setNome}
          />
          <TextInput
            style={s.campo}
            placeholder="Estoque mínimo"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
            value={minimo}
            onChangeText={setMinimo}
          />
          <Botao titulo="Cadastrar" onPress={cadastrar} disabled={ocupado} />
        </View>
        <Text style={s.secao}>Produtos · atualizados em tempo real</Text>
        {produtos.length === 0 ? (
          <Text style={s.dica}>Nenhum produto cadastrado.</Text>
        ) : (
          produtos.map((item) => (
            <View key={item.id} style={s.produto}>
              <View style={{ flex: 1 }}>
                <Text style={s.nomeProduto}>{item.nome}</Text>
                <Text
                  style={item.quantidade <= item.minimo ? s.alerta : s.dica}
                >
                  Saldo: {item.quantidade} · mínimo: {item.minimo}
                  {item.quantidade <= item.minimo ? " · ESTOQUE BAIXO" : ""}
                </Text>
              </View>
              <Botao
                titulo="−1"
                onPress={() => movimentar(item, "saida")}
                disabled={ocupado}
              />
              <Botao
                titulo="+1"
                onPress={() => movimentar(item, "entrada")}
                disabled={ocupado}
              />
            </View>
          ))
        )}
        <Text style={s.secao}>Últimas movimentações</Text>
        {movimentos.length === 0 ? (
          <Text style={s.dica}>Sem movimentações.</Text>
        ) : (
          movimentos.map((m) => (
            <Text key={m.id} style={s.historico}>
              {m.tipo === "entrada" ? "+" : "−"}
              {m.quantidade} · {m.produtoNome}
              {" · "}
              {m.quando?.toDate().toLocaleString("pt-BR") ?? "Sincronizando..."}
            </Text>
          ))
        )}
        <Botao
          titulo="Sair"
          onPress={() => void signOut(auth)}
          disabled={ocupado}
        />
        <Text style={s.dica}>
          Demonstração didática: operações exigem internet; todos os usuários
          cadastrados compartilham o mesmo estoque.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Botao({
  titulo,
  onPress,
  disabled = false,
}: {
  titulo: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[s.botao, disabled && s.desabilitado]}
    >
      <Text style={s.textoBotao}>{titulo}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#eff6fb" },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  conteudo: { padding: 18, gap: 12, paddingBottom: 45 },
  login: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  titulo: { fontSize: 26, fontWeight: "800", color: "#0f3252" },
  subtitulo: { fontSize: 14, color: "#476176" },
  secao: { fontSize: 18, fontWeight: "700", color: "#0f3252", marginTop: 12 },
  campo: {
    borderWidth: 1,
    borderColor: "#d4e0e9",
    backgroundColor: "#fff",
    borderRadius: 9,
    padding: 12,
    fontSize: 16,
    color: "#102a43",
  },
  cartao: {
    borderRadius: 12,
    backgroundColor: "#e1eff8",
    padding: 13,
    gap: 10,
  },
  botao: {
    borderRadius: 8,
    backgroundColor: "#0674ad",
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
  },
  desabilitado: { opacity: 0.5 },
  textoBotao: { color: "#fff", fontWeight: "700", fontSize: 15 },
  produto: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderColor: "#d7e4ea",
    paddingVertical: 11,
  },
  nomeProduto: { fontSize: 17, fontWeight: "700", color: "#20394e" },
  dica: { color: "#607486", fontSize: 13, marginTop: 3 },
  alerta: { color: "#a84411", fontSize: 13, fontWeight: "700", marginTop: 3 },
  erro: {
    backgroundColor: "#ffe4e6",
    color: "#9f1239",
    padding: 10,
    borderRadius: 6,
  },
  historico: {
    fontSize: 14,
    color: "#344960",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderColor: "#d5e1e9",
  },
});
