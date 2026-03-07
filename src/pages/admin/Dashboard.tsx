import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { orders, formatPrice } from '@/data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart, Users, DollarSign, TrendingUp } from 'lucide-react';

const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
const pendingOrders = orders.filter(o => o.status === 'novo' || o.status === 'em_producao').length;

const chartData = [
  { name: 'Jan', pedidos: 12, faturamento: 3200 },
  { name: 'Fev', pedidos: 19, faturamento: 5100 },
  { name: 'Mar', pedidos: orders.length, faturamento: Math.round(totalRevenue) },
];

const stats = [
  { label: 'Pedidos na Fila', value: pendingOrders, icon: ShoppingCart, color: 'text-blue-600' },
  { label: 'Total de Clientes', value: 42, icon: Users, color: 'text-green-600' },
  { label: 'Faturamento', value: formatPrice(totalRevenue), icon: DollarSign, color: 'text-primary' },
  { label: 'Ticket Médio', value: formatPrice(totalRevenue / orders.length), icon: TrendingUp, color: 'text-purple-600' },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Montserrat' }}>Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-muted ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="pedidos" fill="hsl(204, 72%, 33%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="faturamento" fill="hsl(356, 76%, 49%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
