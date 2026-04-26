# 🤖 Loja de Castro — SMS Bot

Chatbot que analisa o site [lojasdecastro.com.br](https://www.lojasdecastro.com.br), gera posts personalizados com IA (Claude) para cada categoria de conteúdo, e os envia por SMS para uma lista de contatos gerenciada no Supabase.

---

## 📁 Estrutura do projeto

```
sms-bot/
├── src/
│   ├── index.js        ← Servidor Express + cron automático
│   ├── generator.js    ← Geração de posts com Claude API
│   ├── scraper.js      ← Scraping do site por categoria
│   ├── sender.js       ← Envio de SMS via Twilio
│   ├── db.js           ← Integração com Supabase
│   ├── cli.js          ← Comandos manuais no terminal
│   └── dashboard.html  ← Painel web de gerenciamento
├── scripts/
│   └── supabase_schema.sql  ← SQL para criar as tabelas
├── .env.example        ← Variáveis de ambiente (modelo)
└── package.json
```

---

## 🚀 Como instalar e configurar

### 1. Clone e instale as dependências
```bash
git clone <seu-repo>
cd sms-bot
npm install
```

### 2. Configure o Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um projeto gratuito
2. Vá em **SQL Editor** e execute o conteúdo de `scripts/supabase_schema.sql`
3. Copie a **URL do projeto** e a **Service Role Key** em Settings > API

### 3. Configure a Twilio (envio de SMS)
1. Crie uma conta em [twilio.com](https://twilio.com) (tem créditos gratuitos)
2. Compre um número de telefone com capacidade de SMS
3. Copie o **Account SID**, **Auth Token** e **número de telefone**

### 4. Configure o arquivo .env
```bash
cp .env.example .env
# Edite o .env com suas chaves reais
```

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+1415xxxxxxx
TARGET_SITE_URL=https://www.lojasdecastro.com.br
CRON_SCHEDULE=0 9 * * 1,3,5   # seg/qua/sex às 9h
```

---

## 🖥️ Como usar

### Iniciar o servidor (com cron automático)
```bash
npm start
# ou em modo dev (reinicia ao salvar):
npm run dev
```

### Comandos manuais via CLI

```bash
# Gera post + envia para todos agora
npm run send-now

# Apenas gera um rascunho (sem enviar)
npm run generate

# Ver preview sem salvar
node src/cli.js preview

# Listar contatos
node src/cli.js contacts

# Adicionar contato
node src/cli.js add-contact "Nome" "+5521999990001"

# Listar categorias
node src/cli.js categories
```

### Painel web
Abra o arquivo `src/dashboard.html` no navegador, ou sirva-o pelo Express adicionando:
```js
app.use(express.static('src'))
```

---

## 🔗 Endpoints da API REST

| Método | Rota                    | Descrição                          |
|--------|-------------------------|------------------------------------|
| GET    | `/health`               | Status do servidor                 |
| GET    | `/contacts`             | Lista contatos ativos              |
| POST   | `/contacts`             | Adiciona contato `{name, phone}`   |
| DELETE | `/contacts/:phone`      | Opt-out de um contato              |
| GET    | `/categories`           | Lista categorias                   |
| GET    | `/posts`                | Últimos 20 posts gerados           |
| POST   | `/generate`             | Gera post (rascunho)               |
| POST   | `/send`                 | Gera + envia para todos            |
| POST   | `/send/:postId`         | Envia rascunho específico          |
| GET    | `/campaigns`            | Histórico de campanhas             |
| POST   | `/webhook/twilio`       | Recebe confirmações de entrega     |

---

## 🔄 Como funciona a rotação de categorias

O bot nunca repete a mesma categoria nos últimos 3 envios. A lógica é:

1. Busca as últimas 3 categorias enviadas no banco
2. Filtra as disponíveis (que não foram usadas recentemente)
3. Escolhe aleatoriamente dentro das disponíveis
4. Se todas foram usadas recentemente → reinicia o ciclo

---

## 🌐 Deploy em produção (sugestão gratuita)

### Railway.app (recomendado)
```bash
# Instale o CLI do Railway
npm install -g railway

railway login
railway init
railway up
```

Configure as variáveis de ambiente no painel do Railway e defina:
```
NODE_ENV=production
API_SECRET=sua_chave_secreta_aqui
```

---

## 📱 Configurar webhook Twilio (confirmações de entrega)

No painel da Twilio, configure o **Status Callback URL** do seu número:
```
https://seu-dominio.railway.app/webhook/twilio
```

---

## 🇧🇷 Alternativa brasileira: Z-API (WhatsApp)

Se preferir enviar via **WhatsApp** em vez de SMS, substitua o `sender.js` pela integração Z-API:

```js
// Em vez de Twilio, use:
await fetch(`https://api.z-api.io/instances/${INSTANCE}/token/${TOKEN}/send-text`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: contact.phone, message: post.content })
})
```

---

## 🆘 Suporte

- Supabase docs: https://supabase.com/docs
- Twilio SMS docs: https://www.twilio.com/docs/sms
- Claude API docs: https://docs.anthropic.com
