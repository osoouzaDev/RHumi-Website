export interface ImportedQuestion {
  texto: string;
  alternativas: Array<{ texto: string; correta: boolean }>;
}

export interface ImportedQuestionSet {
  titulo: string;
  perguntas: ImportedQuestion[];
  treinamento?: {
    titulo?: string;
    descricao?: string;
    tipoMaterial?: 'YOUTUBE' | 'ARTIGO' | 'PDF';
    urlMaterial?: string;
  };
  prova?: {
    descricao?: string;
    notaMinima?: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new Error(`${label} deve conter de 1 a ${maxLength} caracteres.`);
  }
  return value.trim();
}

function validateQuestionSet(titulo: unknown, perguntas: unknown): ImportedQuestionSet {
  if (typeof titulo !== 'string' || titulo.trim().length < 2 || titulo.trim().length > 200) {
    throw new Error('Informe um título entre 2 e 200 caracteres.');
  }
  if (!Array.isArray(perguntas) || perguntas.length === 0 || perguntas.length > 100) {
    throw new Error('O conteúdo precisa ter entre 1 e 100 perguntas.');
  }

  const parsedQuestions = perguntas.map((question, questionIndex): ImportedQuestion => {
    if (!isRecord(question)) {
      throw new Error(`A questão ${questionIndex + 1} está em formato inválido.`);
    }

    const text = requiredText(
      question['texto'] ?? question['pergunta'] ?? question['question'] ?? question['enunciado'],
      `O texto da questão ${questionIndex + 1}`,
      2000,
    );
    const alternatives = question['alternativas'] ?? question['alternatives'] ?? question['opcoes'];
    if (!Array.isArray(alternatives) || alternatives.length < 2 || alternatives.length > 20) {
      throw new Error(`A questão ${questionIndex + 1} precisa ter entre 2 e 20 alternativas.`);
    }

    const correctAnswer = question['resposta_correta'] ?? question['correct_answer'] ?? question['gabarito'];
    const hasCorrectFlags = alternatives.every((alternative) =>
      isRecord(alternative) && typeof (alternative['correta'] ?? alternative['correct']) === 'boolean',
    );
    if (!hasCorrectFlags && correctAnswer === undefined) {
      throw new Error(`Indique a resposta correta da questão ${questionIndex + 1}.`);
    }

    const parsedAlternatives = alternatives.map((alternative, alternativeIndex) => {
      if (!isRecord(alternative)) {
        throw new Error(`A alternativa ${alternativeIndex + 1} da questão ${questionIndex + 1} deve ter texto e indicar se é correta.`);
      }
      const correctFlag = alternative['correta'] ?? alternative['correct'];
      let correta: boolean;
      if (hasCorrectFlags && typeof correctFlag === 'boolean') {
        correta = correctFlag;
      } else if (!hasCorrectFlags && typeof correctAnswer === 'string') {
        const answer = correctAnswer.trim().toLocaleLowerCase();
        const letter = answer.match(/^(?:alternativa|op[cç][aã]o)\s+([a-z])$/i)?.[1]
          ?? answer.match(/^([a-z])$/i)?.[1];
        correta = (typeof alternative['id'] === 'string' &&
          alternative['id'].trim().toLocaleLowerCase() === answer) ||
          (letter !== undefined && letter.toUpperCase().charCodeAt(0) - 65 === alternativeIndex) ||
          (typeof (alternative['texto'] ?? alternative['text']) === 'string' &&
            String(alternative['texto'] ?? alternative['text']).trim().toLocaleLowerCase() === answer);
      } else {
        throw new Error(`A resposta correta da questão ${questionIndex + 1} deve ser uma letra ou texto de alternativa.`);
      }
      return {
        texto: requiredText(
          alternative['texto'] ?? alternative['text'],
          `A alternativa ${alternativeIndex + 1} da questão ${questionIndex + 1}`,
          500,
        ),
        correta,
      };
    });

    if (parsedAlternatives.filter((alternative) => alternative.correta).length !== 1) {
      throw new Error(`A questão ${questionIndex + 1} deve ter exatamente uma alternativa correta.`);
    }
    return { texto: text, alternativas: parsedAlternatives };
  });

  return { titulo: titulo.trim(), perguntas: parsedQuestions };
}

function optionalText(value: unknown, label: string, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requiredText(value, label, maxLength);
}

function importedMaterialType(value: unknown): 'YOUTUBE' | 'ARTIGO' | 'PDF' | undefined {
  if (typeof value !== 'string') return undefined;
  const type = value.trim().toLocaleLowerCase();
  if (['video', 'youtube', 'vídeo', 'vídeo do youtube'].includes(type)) return 'YOUTUBE';
  if (['artigo', 'article', 'artigo externo'].includes(type)) return 'ARTIGO';
  if (type === 'pdf') return 'PDF';
  return undefined;
}

function parseJson(input: string): ImportedQuestionSet {
  let value: unknown;
  try {
    value = JSON.parse(input) as unknown;
  } catch {
    throw new Error('O JSON não está válido. Revise as aspas e vírgulas.');
  }
  if (!isRecord(value)) {
    throw new Error('O JSON deve ser um objeto com título e perguntas.');
  }

  const training = isRecord(value['treinamento']) ? value['treinamento'] : undefined;
  const proof = training && isRecord(training['prova'])
    ? training['prova']
    : isRecord(value['prova']) ? value['prova'] : undefined;
  const imported = validateQuestionSet(
    proof?.['titulo'] ?? value['titulo'] ?? value['title'] ?? training?.['titulo'],
    proof?.['perguntas'] ?? proof?.['questoes'] ?? proof?.['questions'] ??
      value['perguntas'] ?? value['questions'] ?? value['questoes'] ?? value['questões'],
  );

  if (training) {
    const material = Array.isArray(training['materiais']) && isRecord(training['materiais'][0])
      ? training['materiais'][0]
      : undefined;
    imported.treinamento = {
      titulo: optionalText(training['titulo'], 'O título do treinamento', 200),
      descricao: optionalText(training['descricao'], 'A descrição do treinamento', 5000),
      tipoMaterial: importedMaterialType(material?.['tipo']),
      urlMaterial: optionalText(material?.['url'] ?? material?.['link'], 'A URL do material', 2000),
    };
  }

  if (proof) {
    const minimumScore = proof['nota_minima'] ?? proof['nota_minima_aprovacao'];
    const maximumScore = proof['nota_maxima'];
    let percentage: number | undefined;
    if (typeof minimumScore === 'number') {
      percentage = proof['nota_minima'] !== undefined || typeof maximumScore !== 'number'
        ? minimumScore
        : Math.round((minimumScore / maximumScore) * 100);
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        throw new Error('A nota mínima importada deve corresponder a um percentual entre 0 e 100.');
      }
    } else if (minimumScore !== undefined) {
      throw new Error('A nota mínima da prova deve ser um número.');
    }

    imported.prova = {
      descricao: optionalText(proof['descricao'], 'A descrição da prova', 5000),
      notaMinima: percentage,
    };
  }

  return imported;
}

function parseText(input: string): ImportedQuestionSet {
  const lines = input.split(/\r?\n/).map((text, index) => ({ text: text.trim(), number: index + 1 }))
    .filter((line) => line.text.length > 0);
  let section: 'training' | 'material' | 'proof' | 'questions' = 'training';
  let fallbackTitle = '';
  let trainingTitle = '';
  let trainingDescription: string | undefined;
  let materialType: string | undefined;
  let materialUrl: string | undefined;
  let proofTitle = '';
  let proofDescription: string | undefined;
  let maximumScore: number | undefined;
  let minimumScore: number | undefined;
  let hasTrainingDetails = false;
  let hasProofDetails = false;
  let current: { texto: string; alternativas: string[]; correta: string | null } | null = null;
  const perguntas: Array<{ texto: string; alternativas: string[]; correta: string | null }> = [];

  for (const line of lines) {
    if (/^material\s+de\s+estudo$/i.test(line.text)) {
      section = 'material';
      hasTrainingDetails = true;
      continue;
    }
    if (/^prova$/i.test(line.text)) {
      section = 'proof';
      hasProofDetails = true;
      continue;
    }
    if (/^quest(?:ões|oes)$/i.test(line.text)) {
      section = 'questions';
      continue;
    }

    const titleMatch = line.text.match(/^t[ií]tulo\s*:\s*(.*)$/i);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      if (section === 'proof') proofTitle = title;
      else if (section === 'training') {
        trainingTitle = title;
        if (!fallbackTitle) fallbackTitle = title;
      }
      continue;
    }

    const descriptionMatch = line.text.match(/^descri[cç][aã]o\s*:\s*(.*)$/i);
    if (descriptionMatch) {
      if (section === 'proof') proofDescription = descriptionMatch[1].trim();
      else if (section === 'training') {
        trainingDescription = descriptionMatch[1].trim();
        hasTrainingDetails = true;
      }
      continue;
    }

    const questionMatch = line.text.match(/^(?:pergunta|quest[aã]o)(?:\s+\d+)?(?:\s*:\s*(.*))?$/i);
    if (questionMatch) {
      if (current) perguntas.push(current);
      current = { texto: questionMatch[1]?.trim() ?? '', alternativas: [], correta: null };
      continue;
    }

    const promptMatch = line.text.match(/^enunciado\s*:\s*(.*)$/i);
    if (promptMatch) {
      if (!current) throw new Error(`Linha ${line.number}: indique uma questão antes do enunciado.`);
      current.texto = promptMatch[1].trim();
      continue;
    }

    const correctMatch = line.text.match(/^(?:resposta\s+correta|correta|gabarito)\s*:\s*(.+)$/i);
    if (correctMatch) {
      if (!current) throw new Error(`Linha ${line.number}: indique uma pergunta antes da resposta correta.`);
      if (current.correta) throw new Error(`Linha ${line.number}: a questão já possui uma resposta correta indicada.`);
      current.correta = correctMatch[1].trim();
      continue;
    }

    const alternativeMatch = line.text.match(/^([A-Z])\s*[).:-]\s*(.+)$/i);
    if (alternativeMatch) {
      if (!current) throw new Error(`Linha ${line.number}: indique uma pergunta antes das alternativas.`);
      current.alternativas.push(alternativeMatch[2].trim());
      continue;
    }

    const typeMatch = line.text.match(/^tipo\s*:\s*(.+)$/i);
    if (typeMatch) {
      if (section === 'material') materialType = typeMatch[1].trim();
      continue;
    }

    const urlMatch = line.text.match(/^url\s*:\s*(.+)$/i);
    if (urlMatch && section === 'material') {
      materialUrl = urlMatch[1].trim();
      continue;
    }

    const maximumMatch = line.text.match(/^nota\s+m[aá]xima\s*:\s*(.+)$/i);
    const minimumMatch = line.text.match(/^nota\s+m[ií]nima(?:\s+para\s+aprova[cç][aã]o)?\s*:\s*(.+)$/i);
    const scoreMatch = maximumMatch ?? minimumMatch;
    if (scoreMatch) {
      const score = Number(scoreMatch[1].match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.'));
      if (!Number.isFinite(score)) throw new Error(`Linha ${line.number}: informe uma nota numérica.`);
      if (maximumMatch) maximumScore = score;
      else minimumScore = score;
      continue;
    }

    if (/^pontos\s*:/i.test(line.text)) continue;

    throw new Error(`Linha ${line.number}: use "Título:", "Pergunta:", "A) alternativa" ou "Correta: A".`);
  }
  if (current) perguntas.push(current);

  const normalized = perguntas.map((question, questionIndex) => {
    const alternatives = question.alternativas.map((text, alternativeIndex) => ({
      texto: requiredText(text, `A alternativa ${alternativeIndex + 1} da questão ${questionIndex + 1}`, 500),
      correta: false,
    }));
    if (!question.correta) {
      throw new Error(`Indique a resposta correta da questão ${questionIndex + 1} com "Correta: A".`);
    }
    const answer = question.correta.replace(/^(?:alternativa|op[cç][aã]o)\s+/i, '').trim();
    const letter = answer.match(/^([A-Z])$/i);
    const correctIndex = letter
      ? letter[1].toUpperCase().charCodeAt(0) - 65
      : alternatives.findIndex((alternative) => alternative.texto.toLocaleLowerCase() === answer.toLocaleLowerCase());
    if (correctIndex < 0 || correctIndex >= alternatives.length) {
      throw new Error(`A resposta correta da questão ${questionIndex + 1} não corresponde a nenhuma alternativa.`);
    }
    alternatives[correctIndex].correta = true;
    return {
      texto: requiredText(question.texto, `O texto da questão ${questionIndex + 1}`, 2000),
      alternativas: alternatives,
    };
  });

  const imported = validateQuestionSet(proofTitle || fallbackTitle || trainingTitle, normalized);
  if (hasTrainingDetails) {
    imported.treinamento = {
      titulo: optionalText(trainingTitle || undefined, 'O título do treinamento', 200),
      descricao: optionalText(trainingDescription, 'A descrição do treinamento', 5000),
      tipoMaterial: importedMaterialType(materialType),
      urlMaterial: optionalText(materialUrl, 'A URL do material', 2000),
    };
  }
  if (hasProofDetails) {
    let scorePercentage: number | undefined;
    if (minimumScore !== undefined) {
      scorePercentage = maximumScore !== undefined
        ? Math.round((minimumScore / maximumScore) * 100)
        : minimumScore;
      if (!Number.isFinite(scorePercentage) || scorePercentage < 0 || scorePercentage > 100) {
        throw new Error('A nota mínima importada deve corresponder a um percentual entre 0 e 100.');
      }
    }
    imported.prova = {
      descricao: optionalText(proofDescription, 'A descrição da prova', 5000),
      notaMinima: scorePercentage,
    };
  }
  return imported;
}

export function parseLearningImport(input: string): ImportedQuestionSet {
  const cleaned = input.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  if (!cleaned) throw new Error('Cole um texto estruturado ou JSON para importar.');
  return cleaned.startsWith('{') ? parseJson(cleaned) : parseText(cleaned);
}
