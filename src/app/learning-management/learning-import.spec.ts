import { describe, expect, it } from 'vitest';
import { parseLearningImport } from './learning-import';

describe('parseLearningImport', () => {
  it('imports title, multiple questions, alternatives, and answers from structured text', () => {
    const result = parseLearningImport(`Título: Proteção de Dados

Pergunta 1: Qual dado deve ser protegido?
A) Dados pessoais
B) Senhas compartilhadas
Correta: A

Questão 2: Como restringir o acesso?
A) Deixar os dados públicos
B) Liberar para quem precisa utilizá-los
Resposta correta: B`);

    expect(result.titulo).toBe('Proteção de Dados');
    expect(result.perguntas).toHaveLength(2);
    expect(result.perguntas[0].alternativas.map((alternative) => alternative.correta)).toEqual([true, false]);
    expect(result.perguntas[1].alternativas.map((alternative) => alternative.correta)).toEqual([false, true]);
  });

  it('imports full training text with material, proof details, score, and questions', () => {
    const result = parseLearningImport(`Título: Segurança da Informação
Descrição: Boas práticas para proteger dados.

MATERIAL DE ESTUDO
Título: Vídeo sobre proteção de dados
Tipo: Vídeo
URL: https://www.youtube.com/watch?v=gMaX6PSfkNg

PROVA
Título: Avaliação de Segurança da Informação
Descrição: Responda à questão sobre segurança.
Nota máxima: 10
Nota mínima para aprovação: 7

QUESTÕES
Questão 1
Tipo: Múltipla escolha
Enunciado: Atualizar programas ajuda a:
A) Corrigir vulnerabilidades.
B) Compartilhar senhas.
Resposta correta: A
Pontos: 1`);

    expect(result.titulo).toBe('Avaliação de Segurança da Informação');
    expect(result.treinamento).toEqual({
      titulo: 'Segurança da Informação',
      descricao: 'Boas práticas para proteger dados.',
      tipoMaterial: 'YOUTUBE',
      urlMaterial: 'https://www.youtube.com/watch?v=gMaX6PSfkNg',
    });
    expect(result.prova).toEqual({
      descricao: 'Responda à questão sobre segurança.',
      notaMinima: 70,
    });
    expect(result.perguntas[0].texto).toBe('Atualizar programas ajuda a:');
    expect(result.perguntas[0].alternativas.map((alternative) => alternative.correta)).toEqual([true, false]);
  });

  it('imports pasted JSON and accepts common English property names', () => {
    const result = parseLearningImport(`\`\`\`json
{
  "title": "Segurança",
  "questions": [{
    "question": "Qual é a prioridade?",
    "alternatives": [
      { "text": "Segurança", "correct": true },
      { "text": "Velocidade", "correct": false }
    ]
  }]
}
\`\`\``);

    expect(result.titulo).toBe('Segurança');
    expect(result.perguntas[0].alternativas[0].correta).toBe(true);
  });

  it('imports JSON using questoes, enunciado, and resposta_correta keys', () => {
    const result = parseLearningImport(JSON.stringify({
      versao_formato: '1.0',
      titulo: 'Segurança da Informação',
      descricao: 'Descrição ignorada pelo importador de questões.',
      questoes: [{
        id: 'q01',
        tipo: 'multipla_escolha',
        enunciado: 'Atualizar programas ajuda a:',
        alternativas: [
          { id: 'A', texto: 'Corrigir vulnerabilidades.' },
          { id: 'B', texto: 'Compartilhar senhas.' },
        ],
        resposta_correta: 'A',
      }],
    }));

    expect(result.titulo).toBe('Segurança da Informação');
    expect(result.perguntas[0].texto).toBe('Atualizar programas ajuda a:');
    expect(result.perguntas[0].alternativas.map((alternative) => alternative.correta)).toEqual([true, false]);
  });

  it('imports a training with nested proof details, YouTube material, and passing score', () => {
    const result = parseLearningImport(JSON.stringify({
      treinamento: {
        titulo: 'Segurança da Informação',
        descricao: 'Descrição do treinamento.',
        materiais: [{ tipo: 'video', url: 'https://www.youtube.com/watch?v=example' }],
        prova: {
          titulo: 'Avaliação de Segurança',
          descricao: 'Descrição da avaliação.',
          nota_maxima: 10,
          nota_minima_aprovacao: 7,
          questoes: [{
            enunciado: 'Qual prática protege a conta?',
            alternativas: [
              { id: 'A', texto: 'Compartilhar a senha.' },
              { id: 'B', texto: 'Usar uma senha forte.' },
            ],
            resposta_correta: 'B',
          }],
        },
      },
    }));

    expect(result.titulo).toBe('Avaliação de Segurança');
    expect(result.treinamento).toEqual({
      titulo: 'Segurança da Informação',
      descricao: 'Descrição do treinamento.',
      tipoMaterial: 'YOUTUBE',
      urlMaterial: 'https://www.youtube.com/watch?v=example',
    });
    expect(result.prova).toEqual({
      descricao: 'Descrição da avaliação.',
      notaMinima: 70,
    });
    expect(result.perguntas[0].alternativas.map((alternative) => alternative.correta)).toEqual([false, true]);
  });

  it('rejects questions without exactly one correct alternative', () => {
    expect(() => parseLearningImport(`Título: Segurança
Pergunta: Qual é a prioridade?
A) Segurança
B) Velocidade
Correta: C`)).toThrow('não corresponde');
  });
});
