import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
}

class SSEManager {
  private clients: SSEClient[] = [];
  private nextId = 1;

  /**
   * Registra un nuevo cliente SSE. Configura las cabeceras y envía un comentario
   * keep-alive inicial. Retorna el ID del cliente para referencia.
   */
  addClient(res: Response): string {
    const id = `sse-${this.nextId++}`;

    // Cabeceras SSE obligatorias
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Desactiva buffering en proxies Nginx/Ingress
    });

    // Comentario inicial para establecer la conexión
    res.write(':ok\n\n');

    const client: SSEClient = { id, res };
    this.clients.push(client);

    // Limpiar al desconectarse
    res.on('close', () => {
      this.removeClient(id);
    });

    console.log(`[SSE] Cliente conectado: ${id} (total: ${this.clients.length})`);
    return id;
  }

  /**
   * Elimina un cliente SSE por su ID.
   */
  removeClient(id: string): void {
    const index = this.clients.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.clients.splice(index, 1);
      console.log(`[SSE] Cliente desconectado: ${id} (total: ${this.clients.length})`);
    }
  }

  /**
   * Envía un evento a todos los clientes SSE conectados.
   * Los clientes que fallen al escribir serán eliminados.
   */
  broadcast(eventData: any): void {
    const payload = `data: ${JSON.stringify(eventData)}\n\n`;
    const deadClients: string[] = [];

    for (const client of this.clients) {
      try {
        client.res.write(payload);
      } catch {
        deadClients.push(client.id);
      }
    }

    // Limpiar clientes muertos
    for (const id of deadClients) {
      this.removeClient(id);
    }

    if (this.clients.length > 0) {
      console.log(`[SSE] Broadcast enviado a ${this.clients.length} cliente(s).`);
    }
  }

  /**
   * Número de clientes SSE activos.
   */
  getClientCount(): number {
    return this.clients.length;
  }
}

// Singleton exportado
export const sseManager = new SSEManager();
