import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export type LearningKind = 'TREINAMENTO' | 'AVALIACAO';
export type LearningMaterialType = 'YOUTUBE' | 'ARTIGO' | 'PDF';

export interface LearningAlternative {
  id: string;
  texto: string;
  correta?: boolean;
}

export interface LearningQuestion {
  id: string;
  texto: string;
  alternativas: LearningAlternative[];
}

export interface LearningAttemptResult {
  acertos: number;
  total_perguntas: number;
  entregue_em: string;
  percentual: number;
  nota_minima: number | null;
  aprovado: boolean | null;
}

export interface TrainingProof {
  ativa: boolean;
  titulo: string;
  descricao: string;
  nota_minima: number;
  perguntas: LearningQuestion[];
  tentada?: boolean;
  resultado?: LearningAttemptResult | null;
}

export interface LearningItem {
  id: string;
  tipo: LearningKind;
  titulo: string;
  descricao: string | null;
  tipo_material: LearningMaterialType | null;
  url_material: string | null;
  tem_pdf: boolean;
  tem_resultados?: boolean;
  ativo: boolean;
  setores: Array<{ id: string; nome_setor: string }>;
  perguntas: LearningQuestion[];
  prova: TrainingProof | null;
  tentada?: boolean;
  resultado?: LearningAttemptResult | null;
  created_at: string;
  updated_at: string;
}

export interface SaveLearningItem {
  tipo: LearningKind;
  titulo: string;
  descricao: string | null;
  setores: string[];
  ativo: boolean;
  tipo_material: LearningMaterialType | null;
  url_material: string | null;
  perguntas?: Array<{
    id?: string;
    texto: string;
    alternativas: Array<{ id?: string; texto: string; correta: boolean }>;
  }>;
  prova?: {
    ativa: boolean;
    titulo: string | null;
    descricao: string | null;
    nota_minima: number;
    perguntas: Array<{
      id?: string;
      texto: string;
      alternativas: Array<{ id?: string; texto: string; correta: boolean }>;
    }>;
  };
  pdf?: File | null;
}

export interface LearningResult {
  id: string;
  id_usuario: string;
  nome: string;
  email: string;
  acertos: number;
  total_perguntas: number;
  entregue_em: string;
  percentual: number;
  nota_minima: number | null;
  aprovado: boolean | null;
}

export interface LearningPerformanceResult {
  id: string;
  id_conteudo: string;
  titulo: string;
  tipo: LearningKind;
  acertos: number;
  total_perguntas: number;
  percentual: number;
  entregue_em: string;
  nota_minima: number | null;
  aprovado: boolean | null;
}

export interface LearningEmployeePerformance {
  id_usuario: string;
  nome: string;
  email: string;
  cargo: string | null;
  setor: string | null;
  total_respostas: number;
  total_treinamentos: number;
  total_avaliacoes: number;
  media_percentual: number | null;
  resultados: LearningPerformanceResult[];
}

@Injectable({ providedIn: 'root' })
export class LearningService {
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl || 'http://localhost:8000';

  async listar(): Promise<LearningItem[]> {
    const items = await this.request<LearningItem[]>('/api/capacitacoes');
    if (!Array.isArray(items)) throw new Error('A API retornou uma lista de conteúdos inválida.');
    return items;
  }

  async salvar(data: SaveLearningItem, id?: string): Promise<LearningItem> {
    const body = new FormData();
    body.set('tipo', data.tipo);
    body.set('titulo', data.titulo);
    body.set('descricao', data.descricao ?? '');
    body.set('setores', JSON.stringify(data.setores));
    body.set('ativo', String(data.ativo));
    body.set('tipo_material', data.tipo_material ?? '');
    body.set('url_material', data.url_material ?? '');
    if (data.perguntas) body.set('perguntas', JSON.stringify(data.perguntas));
    if (data.prova) body.set('prova', JSON.stringify(data.prova));
    if (data.pdf) body.set('pdf', data.pdf, data.pdf.name);

    return this.request<LearningItem>(
      id ? `/api/capacitacoes/${encodeURIComponent(id)}` : '/api/capacitacoes',
      {
        method: id ? 'PUT' : 'POST',
        body,
      },
    );
  }

  async atualizarStatus(id: string, ativo: boolean): Promise<void> {
    await this.request<{ atualizado: boolean; ativo: boolean }>(
      `/api/capacitacoes/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo }),
      },
    );
  }

  async excluir(id: string, apagarResultados: boolean): Promise<void> {
    await this.request<{ excluido: boolean }>(
      `/api/capacitacoes/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apagar_resultados: apagarResultados }),
      },
    );
  }

  async listarResultados(id: string): Promise<LearningResult[]> {
    const results = await this.request<LearningResult[]>(
      `/api/capacitacoes/${encodeURIComponent(id)}/resultados`,
    );
    if (!Array.isArray(results)) throw new Error('A API retornou um histórico inválido.');
    return results;
  }

  async listarDesempenho(): Promise<LearningEmployeePerformance[]> {
    const performance = await this.request<LearningEmployeePerformance[]>('/api/capacitacoes/desempenho');
    if (!Array.isArray(performance)) throw new Error('A API retornou dados de desempenho inválidos.');
    return performance;
  }

  async enviarAvaliacao(id: string, respostas: Array<{ pergunta_id: string; alternativa_id: string }>): Promise<LearningAttemptResult> {
    return this.request(`/api/capacitacoes/${encodeURIComponent(id)}/respostas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respostas }),
    });
  }

  async baixarPdf(id: string): Promise<Blob> {
    const token = this.authService.getStoredToken();
    if (!token) throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    let response: Response;
    try {
      response = await fetch(`${this.apiUrl}/api/capacitacoes/${encodeURIComponent(id)}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
    } catch {
      throw new Error(`Não foi possível conectar à API em ${this.apiUrl}. Verifique se ela está ativa.`);
    }
    if (!response.ok) {
      let message = `Não foi possível abrir o PDF (HTTP ${response.status}).`;
      try {
        const payload = (await response.json()) as { message?: string };
        message = payload.message || message;
      } catch {
        // A resposta pode não conter JSON quando o servidor ou proxy falha.
      }
      throw new Error(message);
    }
    const file = await response.blob();
    if (file.type !== 'application/pdf') throw new Error('A API retornou um arquivo que não é PDF.');
    return file;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.authService.getStoredToken();
    if (!token) throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    let response: Response;
    try {
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('Accept', 'application/json');
      response = await fetch(`${this.apiUrl}${path}`, {
        ...init,
        credentials: 'include',
        headers,
      });
    } catch {
      throw new Error(`Não foi possível conectar à API em ${this.apiUrl}. Verifique se ela está ativa.`);
    }
    if (response.status === 204) return undefined as T;
    let payload: { status?: string; data?: T; message?: string };
    try {
      payload = await response.json() as { status?: string; data?: T; message?: string };
    } catch {
      throw new Error('A API retornou uma resposta inválida.');
    }
    if (!response.ok || payload.status === 'error' || payload.data === undefined) {
      throw new Error(payload.message || `A solicitação à API falhou (HTTP ${response.status}).`);
    }
    return payload.data;
  }
}
