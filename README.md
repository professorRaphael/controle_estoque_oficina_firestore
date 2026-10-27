# Estoque Compartilhado da Oficina — Firebase Cloud Firestore

**Disciplina:** Programação para Dispositivos Móveis em Android  
**Cursos:** Sistemas de Informação, Ciência da Computação e Análise e Desenvolvimento de Sistemas  
**Tecnologias:** React Native, Expo, TypeScript, Firebase Authentication e Cloud Firestore  
**Natureza:** Projeto didático — **não** é um sistema comercial pronto.

**Autor:** Raphael Mauricio Sanches de Jesus.

## 1. Contexto e objetivo

Este aplicativo simula uma oficina com **um estoque compartilhado** entre celulares. O gerente cria as contas; cada funcionario autenticado visualiza as mesmas peças. Uma entrada ou saída de uma unidade é registrada com uma **transação**, e os outros celulares recebem a mudança por um **listener em tempo real**.

A proposta é complementar dois exemplos anteriores:

| Exemplo | Tecnologia | Principal aprendizado |
| --- | --- | --- |
| Controle de Jogos | SQLite / `expo-sqlite` | SQL e CRUD relacional **local** |
| Mural de Avisos | MongoDB + API Express | Banco no servidor, API REST, login e autorização por perfis |
| **Estoque da Oficina** | **Firestore + Authentication** | Documentos NoSQL, sincronização ao vivo e regras de segurança |

**Importante:** neste exemplo, todos os usuários criados no projeto Firebase conseguem consultar e movimentar o mesmo estoque. Isto é **controle de acesso por autenticação**, não um sistema de papéis como o projeto MongoDB.

## 2. Funcionalidades

- Entrar com e-mail e senha criados previamente pelo gerente.
- Cadastrar um produto com estoque inicial zero e mínimo de referência.
- Visualizar produtos, alertas de estoque baixo e as últimas oito movimentações.
- Registrar entrada e saída de **uma unidade por toque**, impedindo saldo negativo.
- Mostrar atualizações de outros celulares com `onSnapshot()`.
- Atualizar saldo e registrar movimentação na mesma transação via `runTransaction()`.
- Bloquear acessos anônimos e validar parte dos dados com as regras em `firestore.rules`.

Não há cadastro de usuários no aplicativo, recuperação de senha ou permissão de administrador. Tampouco há exclusão de produtos: isso foi reservado para uma evolução da turma.

## 3. Estrutura dos arquivos

```text
EstoqueOficina_Firestore/
├── App.tsx                       # Interface e operações do exemplo
├── src/
│   ├── firebase.ts              # Configuração do Firebase + Auth em memória
│   └── domain/estoque.ts        # Cálculo puro, independente do banco
├── firestore.rules              # Regras para copiar na console do Firestore
├── .env.example                 # Modelo das variáveis Expo
├── .gitignore
└── tests/estoque.test.cjs       # Testes das regras de quantidade
```

A ausência de `package.json` é intencional: **este ZIP fornece os arquivos da aula para serem copiados para um projeto Expo criado com a versão instalada no computador da turma.** Assim, as versões de React Native/Expo são definidas pelo gerador oficial e pelas dependências compatíveis do SDK.

## 4. Passo a passo — preparar o Firebase (gerente)

1. Acesse <https://console.firebase.google.com/> e crie um projeto.
2. Em **Build → Firestore Database**, crie o banco (edição Standard, se houver escolha) e selecione uma região. **Não deixe o banco em modo de teste aberto**. Publique as regras fornecidas em `firestore.rules`, em **Firestore Database → Rules**.
3. Em **Build → Authentication → Sign-in method**, habilite **Email/Password**.
4. Em **Authentication → Users**, adicione **dois usuários de demonstração** (e-mails e senhas separados), para usar em dois celulares. **Não compartilhe senhas reais.**
5. Em **Project settings → Your apps**, cadastre um **Web app** (ícone `</>`), copie `apiKey`, `authDomain`, `projectId` e `appId`. Mesmo para Expo Go, é a configuração do app Web usada pelo Firebase JS SDK.
6. Para manter turmas separadas, use um projeto Firebase distinto por turma ou evolua o esquema com identificador de equipe e regras específicas.

> As chaves `EXPO_PUBLIC_` são públicas no aplicativo. **Elas não são senhas de administrador**. O acesso aos dados depende do Firebase Authentication e das Security Rules. Nunca inclua credenciais de contas de serviço em aplicativos móveis.

## 5. Passo a passo — executar o aplicativo

```bash
npx create-expo-app@latest estoque-oficina --template blank-typescript
cd estoque-oficina
npx expo install firebase
```

Copie `App.tsx`, a pasta `src/` e o arquivo `.env.example` do ZIP para o novo projeto. Para executar os testes e manter as regras junto ao código-fonte, copie também `tests/` e `firestore.rules`. Renomeie `.env.example` para `.env` e preencha os quatro valores com os dados do seu projeto Firebase.

```bash
npx expo start --clear
```

Abra com o **Expo Go** no Android ou iOS. Nesta atividade usamos a **Firebase JavaScript SDK**, que funciona com Expo Go; não é necessário criar um development build. A documentação do Expo recomenda instalar uma versão de `firebase` compatível com o SDK e, atualmente, exige Firebase JS SDK 12 ou superior.

**Atenção:** é indispensável configurar o projeto Firebase e publicar suas regras; o ZIP sozinho não consegue oferecer banco hospedado ou credenciais.

## 6. O que acontece no banco?

Coleção `produtos`:

```json
{
  "nome": "Filtro de óleo",
  "quantidade": 3,
  "minimo": 2,
  "atualizadoEm": "timestamp do servidor"
}
```

Coleção `movimentacoes`:

```json
{
  "produtoId": "ID-do-produto",
  "produtoNome": "Filtro de óleo",
  "tipo": "saida",
  "quantidade": 1,
  "saldoApos": 2,
  "usuario": "UID-da-conta",
  "quando": "timestamp do servidor"
}
```

- `addDoc`: cria um produto.
- `onSnapshot`: recebe alterações em tempo real, sem botão Atualizar.
- `runTransaction`: lê o saldo atual e grava atualização + movimentação de modo atômico.
- `serverTimestamp`: atribui o horário do servidor.
- Security Rules: impedem leituras por usuários não autenticados e validam campos das gravações.

**As regras são didáticas e não garantem auditoria inviolável:** um cliente autenticado e modificado poderia enviar gravações que não correspondem às operações da interface. Para produção, restrinja papéis, organizações e operações críticas e implemente validação de integridade no backend e testes das regras.

## 7. Roteiro de testes

1. Acesse o aplicativo com a **Conta A**. Cadastre `Filtro de óleo`, estoque mínimo `2`.
2. Em outro dispositivo, entre com a **Conta B** e verifique se o produto aparece **sem atualizar manualmente**.
3. Com a Conta A, toque `+1` três vezes; confira o saldo `3` nos dois aparelhos.
4. Com a Conta B, toque `−1` duas vezes; confira saldo `1` e alerta de estoque baixo.
5. Tente nova saída até chegar a `0` e então tente mais uma. O aplicativo deve recusar saldo negativo.
6. Abra o console Firebase, visualize as coleções `produtos` e `movimentacoes`.
7. Faça `Sair`, tente acessar as coleções com uma conta não autenticada usando as regras no Emulator/Rules Playground e discuta o bloqueio.

**Perguntas para discussão:** por que não usamos `localhost` ou API Express? Quem controla o acesso? O que muda se dois usuários movimentarem a mesma peça ao mesmo tempo?

## 8. Desafios

**Nível 1 — interface:** campo de pesquisa; permitir movimentação de uma quantidade digitada (validar inteiros positivos); ordenar pelo menor saldo.

**Nível 2 — persistência:** editar estoque mínimo; adicionar categorias; filtrar histórico por produto e usuário. Revisar as Security Rules para cada nova operação.

**Nível 3 — segurança e arquitetura:** separar UI / serviço / domínio; usar coleções por oficina/equipe; perfis para consulta versus movimentação; testar regras com Firebase Emulator; garantir consistência entre movimentos e estoque com backend confiável.

## 9. Limitações e cuidados

- **Internet é necessária** nesta implementação. Transações Firestore falham offline. O armazenamento offline nativo do Firestore é assunto para evolução de vocês, com React Native Firebase e development build.
- A sessão de login foi configurada **apenas em memória**, propositalmente: será necessário entrar novamente após reiniciar o aplicativo. Persistência de Auth com AsyncStorage é um desafio posterior.
- Todos os usuários autenticados no mesmo projeto compartilham o mesmo estoque. Não use contas de alunos reais no ambiente de demonstração; crie contas de testes e remova-as depois.
- Este exemplo não possui limite de gastos nem mecanismo para impedir abusos de leitura. Verifique uso, cotas e alertas de orçamento no Firebase/Google Cloud quando aplicável.
- Firestore não substitui SQL em todo cenário. Leia sobre custos por operação, índices e modelagem documental.

## 10. Testes de lógica (opcional)

Se tiver TypeScript instalado no projeto:

```bash
npx tsc src/domain/estoque.ts --module commonjs --target es2020 --outDir .test-build
node --test tests/estoque.test.cjs
```

São testes da **regra de negócio local**, e não uma prova de que o Firebase foi configurado ou que a aplicação móvel foi executada.

## 11. Referências

- Expo + Firebase JS SDK: <https://docs.expo.dev/guides/using-firebase/>
- Firestore tempo real: <https://firebase.google.com/docs/firestore/query-data/listen>
- Transações: <https://firebase.google.com/docs/firestore/manage-data/transactions>
- Regras de segurança: <https://firebase.google.com/docs/firestore/security/rules-conditions>
- Planos e preços: <https://firebase.google.com/pricing>

---

**Material para ensino.** A atividade é um ponto de partida: a turma deve experimentar, questionar escolhas e evoluir gradualmente o código, não apenas copiá-lo.
