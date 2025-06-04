# Processo Seletivo Paggo - Análise de Documentos com IA

Este projeto é uma aplicação web completa que permite aos usuários fazer upload de documentos (imagens e PDFs), extrair texto via OCR, interagir com o conteúdo usando inteligência artificial (modelo Gemini 1.5) e gerenciar seus documentos, incluindo o download do texto extraído ou do próprio documento com as anotações de OCR e interações com a IA.

-----

## 1\. Repositórios do Código-Fonte

  * **Backend Service:** [https://github.com/MurakamiHenrique/paggo\_backend.git](https://github.com/MurakamiHenrique/paggo_backend.git)
  * **Frontend Service:** [https://github.com/MurakamiHenrique/paggo\_frontend.git](https://github.com/MurakamiHenrique/paggo_frontend.git)

-----

## 2\. Aplicação Deployada

Você pode acessar a versão deployada da aplicação através dos links abaixo:

  * **Frontend (Vercel):** [https://paggo-frontend-five.vercel.app/](https://paggo-frontend-five.vercel.app/)
  * **Backend (Render):** [https://paggo-backend-api.onrender.com](https://paggo-backend-api.onrender.com)
  * **Banco de Dados:** PostgreSQL hosteado no Supabase (modelado com o Prisma).

**Adendo sobre Performance da Versão Deployada e OCR:**

Note que o **upload e o processamento de arquivos na versão deployada podem levar mais tempo** do que o esperado. Isso ocorre devido às características do serviço de hospedagem gratuito (Render) para o backend, que pode ter **limitações de recursos de CPU e memória** para a execução do OCR (Tesseract.js) e de outras operações intensivas. Em um ambiente de produção real, soluções com recursos dedicados ou serviços de OCR em nuvem (como Google Cloud Vision AI ou AWS Textract) seriam utilizadas para garantir performance e escalabilidade. Além disso, a implementação foi otimizada para textos em português e inglês, portanto, outros idiomas podem ter a precisão um reduzida na transcrição de imagem para texto.

-----

## 3\. Credenciais de Teste

Para testar a plataforma, você pode usar os seguintes usuários pré-cadastrados:

  * **Para o Ambiente Deployado (principal):**

      * **Email:** `admin@deploy.com`
      * **Senha:** `admindeploy`

  * **Para o Ambiente Local:**

      * **Email:** `local@local.com`
      * **Senha:** `senhalocal`

**Observação Crucial sobre Consistência de Dados:**

Para evitar conflitos de permanência de arquivos entre os ambientes local e de deploy no upload e download, **utilize um usuário exclusivamente em um único ambiente (ou local, ou deployado).** O fluxo de upload, chat e download de documentos funciona corretamente em cada ambiente de forma isolada.

O histórico de documentos e interações é **único para cada usuário**.

-----

## 4\. Instruções para Configuração e Execução Local

Siga os passos abaixo para configurar e rodar a solução na sua máquina local.

### Pré-requisitos

  * **Node.js** (versão 18 ou superior recomendada)
  * **npm** (Node Package Manager)
  * **Git**

### 4.1. Configuração e Execução do Backend

1.  **Clone o repositório do backend:**
    ```bash
    git clone https://github.com/MurakamiHenrique/paggo_backend.git
    cd paggo_backend
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    ```
3.  **Gere o cliente Prisma:**
    ```bash
    npx prisma generate
    ```
4.  **Execute as migrações do banco de dados:**
    ```bash
    npx prisma migrate dev --name init
    ```
5.  **Inicie o serviço de backend:**
    ```bash
    npm run start:dev
    ```
    O backend estará rodando em `http://localhost:3000`. **É crucial que o backend esteja rodando antes de iniciar o frontend.**

### 4.2. Configuração e Execução do Frontend

1.  **Clone o repositório do frontend:**
    ```bash
    git clone https://github.com/MurakamiHenrique/paggo_frontend.git
    cd paggo_frontend
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    ```
3.  **Inicie o serviço de frontend:**
    ```bash
    npm run dev
    ```
    O frontend estará rodando em `http://localhost:3001`.