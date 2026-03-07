import { useState } from 'react';
import { orders as initialOrders, Order, OrderStatus, statusLabels, statusColors, formatPrice } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const allStatuses: OrderStatus[] = ['novo', 'em_producao', 'finalizado', 'entregue'];

export default function AdminPedidos() {
  const [ordersList, setOrdersList] = useState<Order[]>([...initialOrders]);
  const [tab, setTab] = useState<string>('todos');
  const { toast } = useToast();

  const changeStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrdersList(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    toast({ title: `Pedido ${orderId} → ${statusLabels[newStatus]}` });
  };

  const filtered = tab === 'todos' ? ordersList : ordersList.filter(o => o.status === tab);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Montserrat' }}>Gerenciar Pedidos</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="todos">Todos ({ordersList.length})</TabsTrigger>
          {allStatuses.map(s => (
            <TabsTrigger key={s} value={s}>{statusLabels[s]} ({ordersList.filter(o => o.status === s).length})</TabsTrigger>
          ))}
        </TabsList>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{order.clientName}</p>
                        <p className="text-xs text-muted-foreground">{order.clientEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{order.items.map(i => i.productName).join(', ')}</TableCell>
                    <TableCell className="font-medium">{formatPrice(order.total)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Select value={order.status} onValueChange={(v: OrderStatus) => changeStatus(order.id, v)}>
                        <SelectTrigger className="w-36 h-8">
                          <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {allStatuses.map(s => (
                            <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
