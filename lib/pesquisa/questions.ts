export type QuestionType = "rating" | "multiple_choice" | "text";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[];
  required: boolean;
}

export const SURVEY_QUESTIONS: Question[] = [
  {
    id: "evento_geral",
    text: "Como você avalia o evento no geral?",
    type: "rating",
    required: true,
  },
  {
    id: "entrada",
    text: "Entrada no evento",
    type: "rating",
    required: true,
  },
  {
    id: "organizacao",
    text: "Organização interna",
    type: "rating",
    required: true,
  },
  {
    id: "limpeza",
    text: "Limpeza e estrutura",
    type: "rating",
    required: true,
  },
  {
    id: "banheiros",
    text: "Banheiros",
    type: "rating",
    required: true,
  },
  {
    id: "alimentacao",
    text: "Alimentação e bebida",
    type: "rating",
    required: true,
  },
  {
    id: "precos",
    text: "Preço das coisas dentro do evento",
    type: "rating",
    required: true,
  },
  {
    id: "seguranca",
    text: "Segurança",
    type: "rating",
    required: true,
  },
  {
    id: "circulacao",
    text: "Facilidade para circular",
    type: "rating",
    required: true,
  },
  {
    id: "experiencia_carnaval",
    text: "Experiência do carnaval em si",
    type: "rating",
    required: true,
  },
  {
    id: "voltaria",
    text: "Você voltaria no próximo ano?",
    type: "multiple_choice",
    options: [
      { value: "sim", label: "Sim" },
      { value: "talvez", label: "Talvez" },
      { value: "nao", label: "Não" },
    ],
    required: true,
  },
  {
    id: "incomodou",
    text: "O que mais te incomodou hoje?",
    type: "text",
    required: false,
  },
  {
    id: "surpreendeu",
    text: "O que mais te surpreendeu positivamente?",
    type: "text",
    required: false,
  },
  {
    id: "melhorar",
    text: "Se pudesse melhorar uma coisa agora, o que seria?",
    type: "text",
    required: false,
  },
];

export const SURVEY_PRIZE = {
  name: "Brinde Surpresa",
  emoji: "🎁",
  description: "Retire seu brinde surpresa no stand da Keepit! Mostre esta tela para nossa equipe.",
};
