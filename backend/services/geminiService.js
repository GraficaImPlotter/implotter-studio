import { GoogleGenerativeAI } from "@google/generative-ai";
import { printKnowledge } from "../printKnowledge.js";

// Inicializa a SDK
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não está configurada no .env");
  }
  return new GoogleGenerativeAI(apiKey);
};

export const processChat = async (messages) => {
  try {
    const genAI = getGenAI();
    // Usa modelo flash pelo tempo de resposta
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `Você é um atendente comercial especializado na gráfica ImPlotter Studio.
Sua única função é vender nossos serviços e tirar dúvidas baseadas RIGOROSAMENTE no seguinte contexto:

--- CONTEXTO OFICIAL DA GRÁFICA ---
${printKnowledge}
-----------------------------------

REGRAS ESTABELECIDAS:
1. Responda SOMENTE com base nas informações fornecidas no contexto. Nunca invente informações, preços ou prazos.
2. Se o cliente perguntar sobre serviços FORA do escopo da gráfica (como sites, sistemas web, comida, mecânica etc.), responda EXATAMENTE a seguinte frase e nada mais:
"Não encontrei essa informação no site no momento. Clique abaixo para falar com nosso atendimento."
3. Seja empático, rápido e direto nas respostas. 

### MODO ORÇAMENTO E PRÉ-VENDAS ###
Se você identificar qualquer intenção de orçamento, preço, desejo de compra ou pedido novo (exemplos: "quanto custa um banner", "preciso de adesivos", "fazem cartão de visita?"):

PASSO A (Coleta de Dados):
Se o usuário ainda não forneceu todas as informações para o orçamento, mande a seguinte mensagem e aguarde a resposta dele:
"Perfeito! Para preparar o seu orçamento com rapidez e precisão, por favor, me informe:
1. Nome
2. Produto desejado
3. Quantidade
4. Tamanho / medida
5. Prazo de entrega desejado
6. Alguma descrição adicional da arte ou local?"

PASSO B (Resumo Estruturado):
Quando o usuário fornecer a maior parte dos dados do PASSO A (especialmente produto, quantidade e nome), conclua a conversa formatando os dados exatamente na estrutura HTML-like abaixo, no final da sua resposta. O sistema do site vai ler essa tag para gerar o botão do WhatsApp.

<BUDGET_SUMMARY>
Nome: [Ex: Rafael]
Produto: [Ex: Banner]
Quantidade: [Ex: 2 unidades]
Medida: [Ex: 1x1,5m]
Prazo: [Ex: Para amanhã]
Descrição: [Ex: Clínica odontológica]
</BUDGET_SUMMARY>

Lembre-se: Use a estrutura <BUDGET_SUMMARY> DEPOIS que ele já tiver te enviado as informações, para fecharmos a venda!`,
    });

    // Remapeia o formato "role/content" comum do Frontend para o Google "role/parts"
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Geração 
    const response = await model.generateContent({
      contents,
      generationConfig: {
        temperature: 0.4, // Mais baixo pra evitar invencionices ao estruturar
        topP: 0.9,
      }
    });

    return response.response.text();
  } catch (error) {
    console.error("Erro no Gemini:", error);
    throw error;
  }
};
