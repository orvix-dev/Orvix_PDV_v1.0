PDV Açaí da Serra - Touch
Um sistema de Ponto de Venda (PDV) simples e moderno, otimizado para telas touch, focado em açaíterias e sorveterias.

Este projeto é um arquivo HTML único que roda 100% no navegador e salva todos os dados localmente (localStorage), permitindo o uso offline sem a necessidade de um servidor.

🚀 Funcionalidades Principais
🛒 Módulo de Venda (PDV)
Venda por KG: Interface otimizada para Açaí e Sorvete com cálculo automático de preço por peso.

Produtos Rápidos: Botões para adicionar itens com preço fixo (ex: Água, Água com Gás).

Carrinho de Compras: Visualização clara dos itens, subtotal e total.

Pagamento Rápido: Finalização de venda com 3 opções de pagamento (Dinheiro, Cartão, PIX).

Cálculo de Troco: Cálculo automático de troco para pagamentos em dinheiro.

Impressão de Recibo: Gera um recibo térmico formatado (80mm) ao finalizar a venda, com texto em negrito para melhor legibilidade.

📋 Módulo de Comandas (Pagamento Posterior)
Salvar Comanda: Opção de "Pagamento Posterior" para salvar uma venda no nome de um cliente (ex: "Mesa 3") sem processar o pagamento.

Adicionar a Comandas Existentes: Permite adicionar novos itens a uma comanda que já está aberta.

Aba "Comandas": Uma aba dedicada lista todas as comandas em aberto em formato de grid, com um contador visual na aba.

Finalização de Comanda: Permite abrir uma comanda, visualizar todos os itens, e finalizá-la com as mesmas opções de pagamento do PDV.

Cronômetro: Exibe o tempo exato que a comanda está aberta.

Exclusão de Comandas: Permite cancelar/excluir uma comanda em aberto diretamente pelo card ou dentro dos detalhes com confirmação de segurança.

📜 Módulo de Histórico
Consulta por Data: Permite filtrar e visualizar todas as vendas finalizadas por dia.

Reimpressão de Recibo: Opção de reimprimir o recibo de qualquer venda diretamente do histórico, com um clique.

Exportação para PDF: Gera um relatório de vendas diário em PDF com todos os itens, pagamentos e totais.

Registro de Tempo: Vendas que vieram de comandas exibem o tempo que ficaram abertas, tanto no histórico quanto no PDF exportado.

Exclusão Segura: Exige uma senha de administrador para excluir um item do histórico.

⚙️ Módulo Administrativo
Acesso Restrito: Múltiplos logins de administrador com senha.

Segurança de Login: Os campos de usuário e senha não são salvos pelo navegador (autocomplete="off") e são limpos após o logout.

Gerenciamento de Preços: Permite atualizar os preços do KG do Açaí e do Sorvete.

Gerenciamento de Produtos: Permite adicionar novos produtos (ex: doces, outros) e atualizar/excluir produtos existentes.

Senha de Exclusão: Configuração da senha mestra necessária para excluir vendas do histórico.

🚀 Como Usar
Basta abrir o arquivo index.html em um navegador moderno (como Google Chrome ou Firefox).

O sistema é totalmente offline-first. Todos os produtos, preços, comandas e vendas são salvos no localStorage do seu navegador.

Não é necessário nenhum servidor ou instalação.
