import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type CalendarScope = 'PESSOAL' | 'SETOR' | 'EMPRESA';

export interface CalendarEvent {
  id: string;
  titulo: string;
  data: string;
  horario: string;
  categoria: string;
  escopo: CalendarScope;
  id_setor: string | null;
  nome_setor: string | null;
  id_criador: string | null;
}

export interface CalendarSector {
  id: string;
  nome_setor: string;
}

export interface CreateCalendarEvent {
  titulo: string;
  data: string;
  horario: string;
  categoria: string;
  escopo: CalendarScope;
  id_setor?: string;
}

interface ApiResponse<T> {
  status?: string;
  data?: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl || 'http://localhost:8000';

  async listar(): Promise<CalendarEvent[]> {
    const events = await this.request<CalendarEvent[]>('/api/calendario/eventos');
    if (!Array.isArray(events)) throw new Error('A API retornou uma lista de eventos inválida.');
    return events;
  }

  async listarSetores(): Promise<CalendarSector[]> {
    const sectors = await this.request<CalendarSector[]>('/api/calendario/setores');
    if (!Array.isArray(sectors)) throw new Error('A API retornou uma lista de setores inválida.');
    return sectors;
  }

  criar(event: CreateCalendarEvent): Promise<CalendarEvent> {
    return this.request('/api/calendario/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  }

  async excluir(id: string): Promise<void> {
    await this.request<void>(`/api/calendario/eventos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.authService.fetchWithSession(`${this.apiUrl}${path}`, init);

    if (response.status === 204) return undefined as T;

    let payload: ApiResponse<T>;
    try {
      payload = await response.json() as ApiResponse<T>;
    } catch {
      throw new Error('A API retornou uma resposta inválida.');
    }
    if (!response.ok || payload.status === 'error' || payload.data === undefined) {
      throw new Error(payload.message || `A solicitação à API falhou (HTTP ${response.status}).`);
    }
    return payload.data;
  }
}
