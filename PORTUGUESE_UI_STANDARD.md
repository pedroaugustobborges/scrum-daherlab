# Padrão de UI em Português Brasileiro

## 📋 Regra Fundamental

**TODA a interface do usuário (UI) deve estar em PORTUGUÊS BRASILEIRO.**

A Daher Lab é uma startup brasileira de inovação em saúde, e todo o conteúdo voltado ao usuário deve estar no idioma nativo dos nossos clientes e equipe.

## ✅ O que deve estar em Português

### 1. Textos de Interface
- Títulos e cabeçalhos
- Botões e labels
- Mensagens de erro e sucesso
- Placeholders em campos de formulário
- Tooltips e ajuda contextual
- Breadcrumbs e navegação

### 2. Conteúdo Dinâmico
- Nomes de status (Ativo, Concluído, Em Progresso, etc.)
- Mensagens do sistema
- Notificações
- Descrições e instruções
- Datas e horários formatados para pt-BR

### 3. Metadados
- Título da página (`<title>`)
- Meta descriptions
- Alt text em imagens
- Labels de acessibilidade (aria-labels)

## 🚫 O que pode permanecer em Inglês

### Código e Desenvolvimento
- Nomes de variáveis, funções e componentes
- Comentários técnicos no código
- Commits do Git
- Documentação técnica de API
- Nomes de arquivos e pastas

### Termos Técnicos Consolidados
- "Sprint" (metodologia SCRUM)
- "Backlog" (metodologia SCRUM)
- "API", "Dashboard" quando usado tecnicamente
- Nomes de tecnologias (React, TypeScript, Supabase)

## 📝 Guia de Tradução Padrão

### Termos SCRUM e Ágil
| Inglês | Português |
|--------|-----------|
| Dashboard | Painel |
| Sprint | Sprint (mantém-se) |
| Backlog | Backlog (mantém-se) |
| User Story | História de Usuário |
| Task | Tarefa |
| To Do | A Fazer |
| In Progress | Em Progresso |
| In Review | Em Revisão |
| Done | Concluído |
| Active | Ativo |
| Completed | Concluído |
| Planning | Planejamento |

### Interface Geral
| Inglês | Português |
|--------|-----------|
| Sign In | Entrar |
| Sign Up | Criar Conta |
| Sign Out / Logout | Sair |
| Settings | Configurações |
| Projects | Projetos |
| Teams | Times |
| Members | Membros |
| Welcome back | Bem-vindo(a) |
| User | Usuário |
| Email | E-mail |
| Password | Senha |
| Full Name | Nome Completo |
| Save | Salvar |
| Cancel | Cancelar |
| Delete | Excluir |
| Edit | Editar |
| Create | Criar |
| Update | Atualizar |

### Mensagens de Status
| Inglês | Português |
|--------|-----------|
| Loading... | Carregando... |
| Saving... | Salvando... |
| Success! | Sucesso! |
| Error | Erro |
| Failed to... | Falha ao... |
| Please wait | Por favor, aguarde |
| Are you sure? | Tem certeza? |

### Tempo e Datas
| Inglês | Português |
|--------|-----------|
| 2 hours ago | há 2 horas |
| 1 day ago | há 1 dia |
| 3 days ago | há 3 dias |
| Yesterday | Ontem |
| Today | Hoje |
| Tomorrow | Amanhã |
| days remaining | dias restantes |

## 🎯 Boas Práticas

### 1. Consistência
- Use sempre os mesmos termos para os mesmos conceitos
- Mantenha a consistência entre páginas e componentes
- Siga este documento como referência única

### 2. Formalidade
- Use tratamento formal mas amigável
- Evite gírias ou expressões regionais muito específicas
- Mantenha um tom profissional

### 3. Inclusão de Gênero
- Use "bem-vindo(a)" ao invés de apenas "bem-vindo"
- Prefira linguagem neutra quando possível
- Exemplo: "usuário" ao invés de especificar gênero

### 4. Localização de Datas
```typescript
// Formato brasileiro de datas
const dateFormatBR = 'DD/MM/YYYY'
const dateTimeFormatBR = 'DD/MM/YYYY HH:mm'

// Locale pt-BR para bibliotecas de data
locale: 'pt-BR'
```

### 5. Números e Moeda
```typescript
// Formato brasileiro
1.234,56 // ao invés de 1,234.56
R$ 1.234,56 // moeda
```

## 🔧 Implementação Técnica

### React/TypeScript
```typescript
// ✅ Correto
<Button>Entrar</Button>
<Typography>Bem-vindo ao Painel</Typography>

// ❌ Incorreto
<Button>Sign In</Button>
<Typography>Welcome to Dashboard</Typography>
```

### Mensagens de Erro
```typescript
// ✅ Correto
throw new Error('Falha ao carregar os dados')
setError('E-mail ou senha inválidos')

// ❌ Incorreto
throw new Error('Failed to load data')
setError('Invalid email or password')
```

## 📚 Recursos

### Dicionários Online
- [Priberam](https://dicionario.priberam.org/)
- [Michaelis](https://michaelis.uol.com.br/)

### Verificação de Português
- LanguageTool para VS Code
- Corretor do próprio navegador

## 🔄 Processo de Revisão

1. **Antes de criar novo componente**: Consulte este documento
2. **Durante o desenvolvimento**: Verifique se todos os textos estão em português
3. **Code Review**: Revisar se há textos em inglês voltados ao usuário
4. **Testes**: Incluir teste visual de toda interface em português

## 📞 Dúvidas

Em caso de dúvidas sobre traduções ou termos específicos:
1. Consulte este documento primeiro
2. Verifique a consistência com outros componentes já implementados
3. Discuta com a equipe de produto
4. Atualize este documento com novos termos padronizados

---

**Última atualização**: Novembro de 2025
**Mantido por**: Equipe de Desenvolvimento Daher Lab
