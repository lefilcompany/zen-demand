import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api`;

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => { navigator.clipboard.writeText(code); toast.success("Copiado!"); }}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function ApiDocsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Documentação da API
        </CardTitle>
        <CardDescription>Exemplos de uso para integrar com a API REST</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Base URL</p>
            <CodeBlock code={BASE_URL} />
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Autenticação</p>
            <p className="text-xs text-muted-foreground mb-2">
              Envie sua API Key no header <code className="bg-muted px-1 rounded">X-API-Key</code>
            </p>
          </div>

          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="js">JavaScript</TabsTrigger>
              <TabsTrigger value="webhook">Webhook</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">GET</Badge>
                  <span className="text-sm font-medium">Listar demandas</span>
                </div>
                <CodeBlock code={`curl -X GET "${BASE_URL}/demands?limit=10" \\
  -H "X-API-Key: sk_live_sua_chave_aqui"`} />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">POST</Badge>
                  <span className="text-sm font-medium">Criar demanda</span>
                </div>
                <CodeBlock code={`curl -X POST "${BASE_URL}/demands" \\
  -H "X-API-Key: sk_live_sua_chave_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Nova demanda via API",
    "board_id": "uuid-do-quadro",
    "status_id": "uuid-do-status",
    "priority": "high"
  }'`} />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">PATCH</Badge>
                  <span className="text-sm font-medium">Atualizar status</span>
                </div>
                <CodeBlock code={`curl -X PATCH "${BASE_URL}/demands/{id}/status" \\
  -H "X-API-Key: sk_live_sua_chave_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{ "status_id": "uuid-novo-status" }'`} />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">GET</Badge>
                  <span className="text-sm font-medium">Listar quadros</span>
                </div>
                <CodeBlock code={`curl -X GET "${BASE_URL}/boards" \\
  -H "X-API-Key: sk_live_sua_chave_aqui"`} />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">GET</Badge>
                  <span className="text-sm font-medium">Listar status</span>
                </div>
                <CodeBlock code={`curl -X GET "${BASE_URL}/statuses" \\
  -H "X-API-Key: sk_live_sua_chave_aqui"`} />
              </div>
            </TabsContent>

            <TabsContent value="js" className="space-y-4">
              <CodeBlock language="javascript" code={`const API_URL = "${BASE_URL}";
const API_KEY = "sk_live_sua_chave_aqui";

// Listar demandas
const response = await fetch(\`\${API_URL}/demands?limit=10\`, {
  headers: { "X-API-Key": API_KEY }
});
const { data } = await response.json();

// Criar demanda
const newDemand = await fetch(\`\${API_URL}/demands\`, {
  method: "POST",
  headers: {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    title: "Nova demanda via API",
    board_id: "uuid-do-quadro",
    status_id: "uuid-do-status",
    priority: "medium"
  })
});`} />
            </TabsContent>

            <TabsContent value="webhook" className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Formato do payload</p>
                <CodeBlock language="json" code={`{
  "event": "demand.status_changed",
  "timestamp": "2026-02-09T12:00:00.000Z",
  "data": {
    "id": "uuid-da-demanda",
    "title": "Título da demanda",
    "status_id": "uuid-do-status",
    "priority": "high",
    ...
  }
}`} />
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Verificação HMAC</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Verifique a assinatura <code className="bg-muted px-1 rounded">X-Webhook-Signature</code> usando o secret do webhook.
                </p>
                <CodeBlock language="javascript" code={`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`} />
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Eventos disponíveis</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">demand.created</Badge>
                  <Badge variant="outline">demand.status_changed</Badge>
                  <Badge variant="outline">demand.updated</Badge>
                  <Badge variant="outline">demand.archived</Badge>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
