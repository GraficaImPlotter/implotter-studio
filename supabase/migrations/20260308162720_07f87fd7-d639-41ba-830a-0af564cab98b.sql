
CREATE TABLE public.site_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage site pages" ON public.site_pages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view site pages" ON public.site_pages FOR SELECT TO anon, authenticated USING (true);

-- Seed default pages
INSERT INTO public.site_pages (slug, title, content) VALUES
('politica-de-privacidade', 'Política de Privacidade', '<p>A Gráfica ImPlotter respeita sua privacidade e está comprometida em proteger seus dados pessoais.</p><h2>Dados Coletados</h2><p>Coletamos apenas os dados necessários para processar seus pedidos e melhorar nossos serviços.</p><h2>Uso dos Dados</h2><p>Seus dados são utilizados exclusivamente para processamento de pedidos, comunicação e melhoria dos serviços.</p><h2>Segurança</h2><p>Utilizamos medidas de segurança adequadas para proteger seus dados pessoais.</p>'),
('termos-de-uso', 'Termos de Uso', '<p>Ao utilizar o site da Gráfica ImPlotter, você concorda com os termos descritos nesta página.</p><h2>Uso do Site</h2><p>Este site é destinado à apresentação de produtos e serviços da Gráfica ImPlotter e à realização de pedidos online.</p><h2>Pedidos e Pagamentos</h2><p>Os pedidos são confirmados após a verificação do pagamento via PIX.</p><h2>Responsabilidades</h2><p>A Gráfica ImPlotter se compromete a entregar os produtos conforme especificado no pedido.</p>'),
('nossa-historia', 'Nossa História', '<p>A <strong>Gráfica ImPlotter</strong> nasceu do compromisso com a excelência em impressão e do desejo de oferecer soluções gráficas completas e acessíveis para empresas de todos os portes.</p><h2>Missão</h2><p>Fornecer materiais gráficos de alta qualidade com atendimento humanizado, agilidade e preço justo.</p><h2>Visão</h2><p>Ser referência em soluções gráficas na nossa região, reconhecida pela inovação, qualidade e confiança.</p><h2>Valores</h2><ul><li>Qualidade em cada detalhe</li><li>Atendimento próximo e transparente</li><li>Compromisso com prazos</li><li>Inovação constante</li><li>Respeito ao cliente</li></ul>');
