/* A Casa Sempre Ganha — motor do relatório (i18n + gráficos SVG + interações).
   Autocontido: lê window.__DATA__ (injetado pelo pipeline) e não usa rede. */
(function () {
"use strict";
var D = window.__DATA__ || {};
var M = D.manual || {};
var LANG = "pt";
var SVGNS = "http://www.w3.org/2000/svg";

/* ---------- formatação por idioma ---------- */
function grp(n, lang) {
  var s = Math.round(n).toString(), sep = lang === "en" ? "," : ".";
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}
function dec(n, d, lang) {
  var f = Number(n).toFixed(d);
  if (lang !== "en") f = f.replace(".", ",");
  var parts = f.split(lang === "en" ? "." : ",");
  parts[0] = grp(parseFloat(parts[0]), lang) === "NaN" ? parts[0] : parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, lang === "en" ? "," : ".");
  return parts.join(lang === "en" ? "." : ",");
}
function reais(n, lang) { return "R$ " + grp(n, lang); }
function biName(lang) { return { pt: "bi", en: "bn", es: "mm" }[lang]; }
function miName(lang) { return { pt: "mi", en: "M", es: "mi" }[lang]; }

/* ---------- utilidades DOM/SVG ---------- */
function el(tag, attrs, kids) {
  var e = document.createElementNS(SVGNS, tag);
  if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (kids) kids.forEach(function (c) { e.appendChild(c); });
  return e;
}
function svg(w, h) { return el("svg", { viewBox: "0 0 " + w + " " + h, preserveAspectRatio: "xMidYMid meet" }); }
function txt(x, y, s, cls, extra) {
  var t = el("text", Object.assign({ x: x, y: y, class: cls || "glabel" }, extra || {}));
  t.textContent = s; return t;
}
function tip(html, ev) {
  var t = document.getElementById("tip");
  t.innerHTML = html; t.style.opacity = "1";
  var x = ev.clientX + 14, y = ev.clientY + 14;
  if (x + 240 > window.innerWidth) x = ev.clientX - 240;
  t.style.left = x + "px"; t.style.top = y + "px";
}
function untip() { document.getElementById("tip").style.opacity = "0"; }

/* ---------- paleta ---------- */
var C = { red: "#e0555a", redDeep: "#b23", green: "#4fb477", amber: "#e6c05a", blue: "#7aa2f7",
  ink: "#e9ecf5", ink2: "#c3c9db", mut: "#8b91a7", line: "#3a4056", paper2: "#232838" };
function mix(a, b, t) {
  function h(x){return [parseInt(x.slice(1,3),16),parseInt(x.slice(3,5),16),parseInt(x.slice(5,7),16)];}
  var A=h(a),B=h(b),r=A.map(function(v,i){return Math.round(v+(B[i]-v)*t);});
  return "#"+r.map(function(v){return ("0"+v.toString(16)).slice(-2);}).join("");
}
function seqRed(t){ return mix("#2a2f42", C.red, Math.max(0, Math.min(1, t))); }
function seqBlue(t){ return mix("#2a2f42", C.blue, Math.max(0, Math.min(1, t))); }

/* =========================================================
   DICIONÁRIO TRILÍNGUE
   ========================================================= */
var TXT = {};
TXT.pt = {
  dir: "por proxy", of: "de", to: "a", read: "Como ler",
  nav: { panorama: "Panorama", trajetoria: "Trajetória", conta: "A conta", matematica: "A perda", economia: "O vazio", custo: "O custo", geografia: "Geografia", dossie: "Dossiê", robustez: "Robustez", apendice: "Apêndice" },
  hero: {
    kicker: "Apostas de quota fixa · Brasil · 2018–2026",
    sub: "The House Always Wins · La Banca Siempre Gana",
    thesis: "As apostas online extraem um volume enorme de dinheiro das famílias brasileiras, concentram a extração nas mais pobres, devolvem quase nada em emprego e em arrecadação útil, e deixam um custo sanitário que supera o que o setor recolhe aos cofres públicos. Este relatório mede cada elo dessa cadeia com dados oficiais, e mostra a tensão onde ela existe.",
    src: "Fontes: SPA/Ministério da Fazenda · Banco Central (EE119) · IEPS · LENAD III/Unifesp · DATASUS/SIM · IBGE/PNADC · Google Trends. Período 2018–2026. Cobertura: 27 UFs. Método: transcrição de fontes primárias e coleta viva via API, com cache. Autor: Avner Paes Gomes · Julho de 2026.",
    strip: [
      { v: "R$ 37 bi", l: "de receita bruta do setor (GGR) em 2025", tone: "" },
      { v: "25,2 mi", l: "de brasileiros apostaram em 2025", tone: "" },
      { v: "R$ 38,8 bi", l: "de custo social e sanitário por ano (IEPS)", tone: "" },
      { v: "1.144", l: "empregos formais em todo o setor de apostas", tone: "ok" }
    ]
  },
  sec: {
    panorama: {
      eyebrow: "Panorama", title: "O tamanho da máquina",
      lede: "Em um único ano de mercado regulado, as apostas de quota fixa movimentaram dezenas de bilhões de reais e alcançaram um em cada seis adultos do país. O setor é grande, novo e concentrado.",
      prose: [
        "<span class='lead-in'>O mercado nasceu enorme.</span> Segundo os panoramas da Secretaria de Prêmios e Apostas do Ministério da Fazenda, as empresas autorizadas registraram uma receita bruta de jogo (o <span class='term' tabindex='0' data-tip='GGR (Gross Gaming Revenue): o total apostado menos os prêmios pagos. É o que fica com a casa antes de custos e impostos.'>GGR</span>) de cerca de <b>R$ 37 bilhões em 2025</b>, com <b>25,2 milhões</b> de apostadores e <b>79 operadoras</b> licenciadas. Só no primeiro semestre foram R$ 17,4 bilhões de GGR e 17,7 milhões de apostadores.",
        "O GGR não é o quanto o brasileiro apostou. É o quanto a casa reteve depois de pagar os prêmios. O valor total transacionado é muito maior: o Banco Central mediu <b>entre R$ 18 e R$ 21 bilhões por mês</b> em transferências via Pix para operadoras de apostas no início de 2025. O dinheiro que entra é o dinheiro que sai do orçamento das famílias."
      ],
      cap: "<b>O funil do setor em 2025.</b> Da esquerda para a direita: o fluxo mensal estimado de Pix para as bets, a receita bruta anual retida pela casa (GGR), e a arrecadação pública. Cada barra é uma fração da anterior. Leia como um funil: quase tudo que entra fica com o setor, pouco chega ao Estado.",
      stats: [
        { v: "R$ 20 bi", l: "por mês em Pix para bets", n: "Banco Central, 1º tri/2025", tone: "" },
        { v: "79", l: "operadoras autorizadas", n: "SPA/MF, 2025", tone: "ink" },
        { v: "1 em 6", l: "adultos apostaram", n: "17,7 mi no 1º semestre de 2025", tone: "amber" },
        { v: "R$ 8,8 bi", l: "de arrecadação em 2025", n: "12% do GGR (Lei 14.790/2023)", tone: "ok" }
      ],
      pull: "A casa não aposta. A casa coleta."
    },
    trajetoria: {
      eyebrow: "Trajetória", title: "A subida de uma curva nova",
      lede: "Legalizada em 2018, empurrada pelo tigrinho em 2023 e regulada em 2025, a aposta online virou hábito de alta frequência. O interesse de busca acompanha os salários, os benefícios e os grandes eventos.",
      prose: [
        "<span class='lead-in'>Uma história recente, de aceleração rápida.</span> A <span class='term' tabindex='0' data-tip='Lei 13.756/2018 legalizou as apostas de quota fixa; a Lei 14.790/2023 regulamentou o setor e fixou a alíquota de 12% sobre o GGR.'>Lei 13.756</span> de 2018 legalizou as apostas de quota fixa, mas foi entre 2023 e 2025, com o <span class='term' tabindex='0' data-tip='Jogo do tigrinho (Fortune Tiger): jogo de cassino online no formato slot que viralizou no Brasil em 2023 e virou sinônimo popular das bets.'>jogo do tigrinho</span> e o início do mercado regulado, que a aposta virou fenômeno de massa. A série de interesse de busca do Google Trends serve de sinal de alta frequência para essa trajetória, já que o dado de gasto mensal por região não é público.",
        "O padrão não é ruído. O interesse sobe perto das datas de pagamento e explode em torno de grandes eventos esportivos. Quando o Banco Central cruzou o calendário, encontrou picos de transferências alinhados aos dias de crédito de salário e de benefício social, o retrato de um consumo que compete diretamente com o orçamento doméstico."
      ],
      cap: "<b>Interesse de busca por termos de aposta no Brasil, 2019–2026.</b> Índice do Google Trends (0–100, relativo ao pico de cada termo). As marcas verticais assinalam eventos: regulação, início do mercado e Copa. Como ler: a linha é proxy de atenção e demanda, não de valor apostado; serve para datar a aceleração, não para medir o gasto.",
      cap_stl: "<b>Decomposição sazonal (STL) do interesse por 'bet'.</b> A série observada é separada em tendência de fundo e componente sazonal que se repete a cada ano. Como ler: a tendência mostra o crescimento estrutural; a sazonalidade mostra o pulso do calendário.",
      stats: [
        { v: "2018", l: "legalização (Lei 13.756)", n: "quota fixa autorizada", tone: "ink" },
        { v: "2023", l: "o tigrinho viraliza", n: "aposta vira fenômeno de massa", tone: "amber" },
        { v: "2025", l: "mercado regulado começa", n: "domínio bet.br, 79 operadoras", tone: "ink" }
      ],
      pull: "O acaso é o produto. A perda é o modelo de negócio."
    },
    conta: {
      eyebrow: "Quem paga a conta", title: "A conta desce a renda",
      lede: "O jogo de risco não se distribui por igual. Ele se concentra onde o dinheiro é mais curto. Quanto menor a renda, maior a fatia de apostadores em uso arriscado. Este é o eixo moral do relatório.",
      prose: [
        "<span class='lead-in'>A regressividade é a assinatura do setor.</span> A <span class='term' tabindex='0' data-tip='LENAD III: III Levantamento Nacional de Álcool e Drogas, Unifesp/INPAD com apoio do Ministério da Justiça, 2025. Amostra nacional de 16.608 pessoas de 14 anos ou mais.'>LENAD III</span> estimou que <b>7,3% dos brasileiros de 14 anos ou mais</b> apostam de forma arriscada ou problemática, cerca de <b>10,9 milhões de pessoas</b>, e que <b>0,8%</b> já preenchem critério de transtorno do jogo, perto de 1,4 milhão. Entre quem apostou no último ano, o risco cai à medida que a renda sobe: na faixa de menos de um salário mínimo, mais da metade está em uso de risco.",
        "O Banco Central chegou ao mesmo território por outro caminho. Em agosto de 2024, beneficiários do <span class='term' tabindex='0' data-tip='Bolsa Família: principal programa de transferência de renda do Brasil, voltado a famílias em situação de pobreza.'>Bolsa Família</span> transferiram cerca de <b>R$ 3 bilhões</b> via Pix para casas de aposta em um único mês, e <b>17% dos inscritos no CadÚnico</b> apostaram no período. O dinheiro desenhado para tirar famílias da pobreza vazou, em parte, para o giro de um caça-níquel."
      ],
      cap: "<b>Uso de risco entre apostadores, por faixa de renda pessoal (LENAD III).</b> Cada barra é a parcela de apostadores do último ano em uso de risco ou problemático dentro da faixa de renda. Como ler: a barra encolhe conforme a renda sobe. A regressividade não é retórica, é gradiente.",
      stats: [
        { v: "10,9 mi", l: "em uso arriscado de apostas", n: "7,3% da população 14+ (LENAD III)", tone: "" },
        { v: "R$ 3 bi", l: "do Bolsa Família em bets", n: "via Pix, agosto de 2024 (BCB)", tone: "" },
        { v: "17%", l: "dos inscritos no CadÚnico apostaram", n: "Banco Central, EE119", tone: "amber" },
        { v: "55%", l: "dos adolescentes que apostam em risco", n: "faixa 14–17 anos (LENAD III)", tone: "" }
      ],
      pull: "Quanto mais curto o bolso, mais pesada a aposta."
    },
    matematica: {
      eyebrow: "A matemática da perda", title: "A vantagem da casa não é sorte, é projeto",
      lede: "Todo jogo de aposta devolve menos do que arrecada. Com um retorno ao apostador de 93%, cada real girado perde sete centavos, sempre. Simulamos a banca de vinte mil apostadores para mostrar o que isso vira no tempo.",
      prose: [
        "<span class='lead-in'>A perda é estrutural, não é azar.</span> O <span class='term' tabindex='0' data-tip='RTP (Return to Player): a fração do valor apostado que, no longo prazo, retorna ao conjunto dos apostadores. Um RTP de 93% significa 7% de margem garantida para a casa.'>RTP</span> típico de um jogo de cassino online gira em torno de 93%. Rodamos uma simulação de <span class='term' tabindex='0' data-tip='Monte Carlo: método que repete um processo aleatório milhares de vezes para estimar a distribuição de resultados possíveis.'>Monte Carlo</span> com vinte mil apostadores, banca inicial de R$ 500 e apostas de R$ 20 num jogo com RTP de 93%. O resultado é implacável: na mediana, a banca chega a zero.",
        "Não é que ninguém ganhe. Uma minoria termina no azul em qualquer instante dado. Mas o agregado é uma máquina de subtração: ao longo de trezentas apostas, mais da metade das trajetórias se arruína, e apenas cerca de um em dez termina acima de onde começou. A casa não precisa trapacear. A margem faz o trabalho."
      ],
      cap: "<b>Saldo simulado de 20.000 apostadores ao longo de 300 apostas (RTP 93%).</b> A faixa mostra os percentis 5, 25, 50, 75 e 95 da banca; a linha vermelha é a curva de ruína (percentual já falido). Como ler: a banca mediana desce até zerar; a probabilidade de ruína só cresce. O tempo é aliado da casa.",
      stats: [
        { v: "93%", l: "de retorno ao apostador (RTP)", n: "7% de margem garantida à casa", tone: "amber" },
        { v: "R$ 0", l: "banca mediana ao fim de 300 apostas", n: "simulação Monte Carlo", tone: "" },
        { v: "54%", l: "dos apostadores se arruínam", n: "banca chega a zero", tone: "" },
        { v: "10%", l: "terminam no lucro", n: "o resto perde tudo ou parte", tone: "ok" }
      ],
      pull: "Você pode ganhar uma aposta. Você não pode ganhar a matemática."
    },
    economia: {
      eyebrow: "O vazio econômico", title: "Muito dinheiro, quase nenhum emprego",
      lede: "A defesa do setor promete economia e trabalho. Os registros formais contam outra história: um punhado de vagas, salários que somem diante da receita, e uma arrecadação pequena frente ao custo que gera.",
      prose: [
        "<span class='lead-in'>O emprego prometido não aparece nos registros.</span> O dossiê do IEPS, a partir da <span class='term' tabindex='0' data-tip='RAIS: Relação Anual de Informações Sociais, registro administrativo do Ministério do Trabalho com o vínculo formal de emprego no Brasil.'>RAIS</span> de 2024, encontrou apenas <b>1.144 empregos formais</b> em todo o setor de apostas, distribuídos por 60 empregadores. Para efeito de comparação, um único shopping de porte médio emprega mais gente. E o salário some diante da receita: para cada <b>R$ 291</b> que entram, apenas <b>R$ 1</b> vira remuneração de trabalhador.",
        "A arrecadação também é modesta perto do rastro que deixa. O setor recolheu cerca de R$ 8,8 bilhões em 2025, dos quais só <b>1% é destinado por lei ao Ministério da Saúde</b>. Do outro lado do balanço está o custo social estimado em R$ 38,8 bilhões por ano. A indústria contesta e fala em 15 mil empregos diretos e indiretos e R$ 28 bilhões injetados; mesmo aceito o número mais generoso, a conta sanitária ainda supera a econômica."
      ],
      cap: "<b>Onde vai a receita de R$ 291.</b> Para cada R$ 291 de receita do setor, R$ 1 vira salário formal. A barra maior é receita retida; o fio à direita é o trabalho pago. Como ler: a desproporção é o ponto. O setor gira dinheiro, não gera trabalho.",
      stats: [
        { v: "1.144", l: "empregos formais no setor", n: "RAIS 2024, 60 empregadores", tone: "ok" },
        { v: "R$ 1 : R$ 291", l: "salário por receita", n: "1 real de salário a cada 291 de receita", tone: "" },
        { v: "84%", l: "dos trabalhadores sem previdência", n: "média nacional é 36%", tone: "" },
        { v: "1%", l: "da arrecadação vai à Saúde", n: "diante de R$ 38,8 bi de custo", tone: "" }
      ],
      pull: "Um setor que move bilhões e paga mil salários não é uma economia. É um cano."
    },
    custo: {
      eyebrow: "O custo humano", title: "O pedágio que não aparece na fatura",
      lede: "O preço do setor não é pago no caixa da casa de aposta. É pago no pronto-socorro, no consultório e no velório. E a curva de mortes por suicídio subiu junto com a expansão do jogo.",
      prose: [
        "<span class='lead-in'>O dano tem um número, e ele é grande.</span> O IEPS estimou o custo social e sanitário das apostas em <b>R$ 38,8 bilhões por ano</b>, dos quais <b>R$ 30,6 bilhões</b>, quase 79%, ligados diretamente à saúde. A maior parcela, <b>R$ 17 bilhões</b>, corresponde a mortes adicionais por suicídio associadas ao jogo problemático; outros <b>R$ 13,4 bilhões</b> à depressão. São desfechos associados ao jogo, sem afirmação de causalidade, mas a literatura internacional é consistente: transtorno do jogo eleva mortalidade e multiplica o risco de suicídio.",
        "Os dados do <span class='term' tabindex='0' data-tip='SIM: Sistema de Informação sobre Mortalidade do Ministério da Saúde, registro oficial dos óbitos no Brasil por causa (CID-10).'>SIM/DATASUS</span> mostram o pano de fundo. As mortes por lesões autoprovocadas voluntariamente (CID-10 X60–X84) passaram de cerca de 11 mil por ano em meados da década passada para mais de 17 mil no dado consolidado mais recente, uma alta superior a 50%. A expansão do jogo não é a única causa dessa curva, mas cavalga sobre ela, e o custo estimado pelo IEPS é justamente essa fração atribuível."
      ],
      cap: "<b>Óbitos por lesões autoprovocadas (suicídio, CID-10 X60–X84) no Brasil, por ano.</b> Contagem anual do SIM/DATASUS, por UF de residência somada. Como ler: a curva sobe de forma persistente; o relatório atribui ao jogo apenas a fração estimada pelo IEPS, não o total.",
      cap_cost: "<b>Composição do custo social de R$ 38,8 bilhões por ano (IEPS).</b> Cada segmento é um componente do dano. Como ler: saúde domina; o suicídio sozinho responde por quase metade. O que fica de fora, como o dinheiro perdido pelas famílias, tornaria a barra maior.",
      stats: [
        { v: "R$ 30,6 bi", l: "de custo ligado à saúde por ano", n: "78,8% do custo social (IEPS)", tone: "" },
        { v: "R$ 17 bi", l: "atribuídos ao suicídio", n: "quase metade do custo total", tone: "" },
        { v: "+52%", l: "de mortes por suicídio 2015–2023", n: "SIM/DATASUS (X60–X84)", tone: "" },
        { v: "537×", l: "custo ao SUS ante o repasse das bets", n: "R$ 30,6 bi vs. ~R$ 57 mi/ano", tone: "" }
      ],
      pull: "A sorte é privada. O dano é público."
    },
    geografia: {
      eyebrow: "Geografia", title: "Um mapa que só se pode ler por proxy",
      lede: "Onde se aposta mais? O Banco Central declarou de uso interno o gasto por município. Sem esse dado, cruzamos intensidade de busca, suicídio, saúde mental e renda por estado. As associações são espaciais, não causais.",
      prose: [
        "<span class='lead-in'>A honestidade aqui é o método.</span> Não existe estatística pública do valor apostado por estado ou município: o Banco Central afirmou que esse recorte é de uso interno. Então este mapa trabalha por <b>proxy</b>. A intensidade de busca do Google Trends por termos de aposta é o melhor indicador aberto de atenção geográfica, e a cruzamos com a taxa de suicídio (SIM), a rede de saúde mental (CAPS/CNES) e a renda domiciliar per capita (IBGE/PNADC).",
        "O leitor deve manter em mente a <span class='term' tabindex='0' data-tip='Falácia ecológica: erro de inferir sobre indivíduos a partir de médias de grupos. Uma correlação entre estados não prova relação no nível das pessoas.'>falácia ecológica</span>. Um estado com mais busca e mais suicídio não prova que uma coisa cause a outra, nem que sejam as mesmas pessoas. São padrões no território, úteis para levantar hipóteses e perigosos para concluir. Troque a camada nos botões e veja como cada indicador redesenha o país."
      ],
      cap: "<b>Mapa coroplético das 27 UFs.</b> Escolha a camada: intensidade de busca (proxy de aposta), taxa de suicídio por 100 mil, CAPS por 100 mil habitantes ou renda per capita. Como ler: tons mais fortes marcam valores mais altos. Associações são espaciais e não causais; leia como hipótese, não como prova.",
      cap_corr: "<b>Correlação entre estados (Spearman, n=27).</b> Coeficientes entre busca, suicídio e renda, com intervalo de 95% por bootstrap. Como ler: barras à direita indicam associação positiva, à esquerda negativa; o intervalo que cruza o zero é inconclusivo.",
      layers: { search: "Busca (proxy)", suicide: "Suicídio /100 mil", caps: "CAPS /100 mil", income: "Renda per capita" },
      pull: "O território sugere. Ele não confessa."
    },
    dossie: {
      eyebrow: "Dossiê · Regulação em disputa", title: "O que o Estado faz, e o que hesita em fazer",
      lede: "A regulação das bets está sendo escrita agora, entre uma CPI cujo relatório foi rejeitado, um projeto para dobrar o imposto e uma fila de mais de 200 mil pessoas pedindo para serem bloqueadas de si mesmas.",
      prose: [
        "<span class='lead-in'>O Congresso mediu o problema e recuou.</span> A <span class='term' tabindex='0' data-tip='CPI: Comissão Parlamentar de Inquérito, instrumento do Legislativo para investigar fatos determinados.'>CPI das Bets</span> do Senado terminou com o relatório final rejeitado, a primeira rejeição de um relatório final de CPI no Senado em cerca de uma década. Em paralelo, o PL 5473/2025 propõe <b>dobrar a alíquota</b> sobre o GGR, de 12% para 24%. E a resposta mais eloquente veio do próprio público: a plataforma federal de autoexclusão recebeu <b>mais de 217 mil pedidos em 40 dias</b>, e 37% deles citaram perda de controle ligada à saúde mental.",
        "O contraste com o Reino Unido é instrutivo. Lá, o <span class='term' tabindex='0' data-tip='OHID: Office for Health Improvement and Disparities, órgão de saúde pública do Reino Unido cuja estimativa de custo dos danos do jogo serviu de base à metodologia do IEPS.'>OHID</span> estimou o custo dos danos do jogo, restrições de publicidade foram adotadas e uma taxa estatutária financia prevenção e tratamento. É o modelo do qual o IEPS transferiu, com cautela, a metodologia de custo para o Brasil."
      ],
      scn: [
        { cls: "down", h: "CPI rejeitada", p: "O relatório final da CPI das Bets foi rejeitado no Senado, primeira rejeição de relatório de CPI na Casa em cerca de dez anos. O diagnóstico existiu; a conclusão política, não." },
        { cls: "up", h: "PL 5473/2025", p: "Projeto propõe dobrar a alíquota sobre o GGR de 12% para 24%, aproximando a tributação do custo social. Ainda em tramitação." },
        { cls: "", h: "Autoexclusão", p: "A plataforma federal de autoexclusão (lançada em 10/12/2025) somou mais de 217 mil pedidos em 40 dias; 37% por perda de controle ligada à saúde mental." },
        { cls: "", h: "Modelo britânico", p: "Reino Unido: estimativa de custo pelo OHID, restrição de publicidade e taxa estatutária para prevenção e tratamento. Referência da metodologia do IEPS." }
      ],
      evid_title: "Evidência acadêmica",
      evid_lede: "Referências localizadas pelo protocolo de busca científica paper-lookup (k-dense scientific-agent-skills) sobre a base OpenAlex, cada uma com DOI verificado no OpenAlex e conferido no CrossRef, sem fabricação.",
      pull: "Duzentas mil pessoas pediram para serem protegidas de um produto legal."
    },
    robustez: {
      eyebrow: "Robustez", title: "O que a estimativa inclui, e o que deixa de fora",
      lede: "A cifra de R$ 38,8 bilhões é conservadora por construção. Ela foi transferida do Reino Unido por paridade de poder de compra e exclui danos reais que não pôde medir. Mostrar isso é parte do rigor.",
      prose: [
        "<span class='lead-in'>Uma estimativa honesta declara seus limites.</span> O custo social do IEPS não foi inventado para o Brasil: foi transferido das estimativas do <span class='term' tabindex='0' data-tip='Paridade de poder de compra (PPC): ajuste que compara valores entre países pelo que cada moeda efetivamente compra, não pela taxa de câmbio.'>OHID britânico</span> por paridade de poder de compra, uma escolha deliberadamente conservadora. E, mesmo assim, ela deixa de fora componentes de dano por falta de evidência robusta o suficiente para precificar.",
        "Ficam de fora, entre outros, os danos a relacionamentos e vínculos familiares, a violência doméstica, a produtividade perdida no trabalho e, sobretudo, <b>o próprio dinheiro que as famílias perdem apostando</b>. Ou seja: a maior transferência de renda do problema, das famílias para as casas de aposta, não está sequer contada nos R$ 38,8 bilhões. A cifra é um piso, não um teto."
      ],
      cap: "<b>O que entra e o que fica de fora da estimativa de custo.</b> À esquerda, componentes contabilizados (suicídio, depressão, moradia, seguro-desemprego, encarceramento). À direita, danos reconhecidos mas não precificados. Como ler: a coluna de exclusões é o motivo de a estimativa ser um piso.",
      incl_title: "Contabilizado",
      excl_title: "Reconhecido, não precificado",
      incl: ["Mortes por suicídio (R$ 17 bi)", "Depressão: qualidade de vida e tratamento (R$ 13,4 bi)", "Perda de moradia (R$ 1,3 bi)", "Seguro-desemprego (R$ 2,1 bi)", "Encarceramento por atividade criminal (R$ 4,7 bi)"],
      excl: ["O dinheiro perdido pelas famílias apostando", "Danos a relacionamentos e vínculos familiares", "Violência doméstica associada", "Produtividade perdida no trabalho", "Efeitos de longo prazo sobre crianças e adolescentes"],
      caveats_title: "Sinais de cautela declarados",
      caveats: ["Quebra metodológica: mercado só é regulado e medido a partir de 2025; séries anteriores misturam CNAE.", "Proxy geográfico: gasto por município é de uso interno no BC; usamos busca do Google Trends.", "Falácia ecológica: as correlações entre UFs são espaciais, não individuais nem causais.", "Transferência internacional: custos de saúde vêm do OHID/UK ajustados por PPC.", "Associação, não causa: os desfechos de saúde são associados ao jogo problemático."],
      pull: "Quando a dúvida existe, o relatório mostra a dúvida."
    },
    apendice: {
      eyebrow: "Apêndice", title: "Os 27 estados, lado a lado",
      lede: "Índice de busca, taxa de suicídio, rede de saúde mental e renda por unidade da federação. Clique num cabeçalho para reordenar e ver quais estados lideram cada eixo.",
      cols: { uf: "UF", name: "Estado", search: "Busca (0–100)", suicide: "Suicídio /100k", caps: "CAPS /100k", income: "Renda (R$)" },
      cap: "<b>Tabela por UF, ordenável.</b> Busca: índice do Google Trends (proxy de aposta). Suicídio: óbitos X60–X84 por 100 mil habitantes (SIM). CAPS: unidades por 100 mil (CNES). Renda: domiciliar per capita (PNADC). Clique nos cabeçalhos para ordenar."
    }
  },
  foot: {
    title: "A Casa Sempre Ganha",
    method: "Metodologia: números transcritos das fontes primárias (SPA/MF, Banco Central EE119, IEPS, LENAD III/Unifesp) e coletados ao vivo via API com cache em disco (DATASUS/SIM e CNES por TABNET, IBGE/PNADC por SIDRA, Google Trends por pytrends). Modelo estatístico principal: simulação de Monte Carlo do saldo do apostador (RTP 93%, 20.000 trajetórias); complementos: decomposição sazonal STL e correlações de Spearman entre UFs com intervalo por bootstrap. Revisão de literatura pelo protocolo paper-lookup sobre a base OpenAlex, com DOI verificado.",
    sources: "Fontes: Secretaria de Prêmios e Apostas/Ministério da Fazenda; Banco Central do Brasil (Estudo Especial 119); IEPS, dossiê 'A saúde dos brasileiros em jogo'; LENAD III (Unifesp/INPAD e Ministério da Justiça); DATASUS (SIM, CNES); IBGE (PNAD Contínua); Google Trends.",
    offline: "Relatório autocontido e offline: todo o CSS, o JavaScript e os dados estão embutidos neste arquivo único, sem dependências externas em tempo de execução. Gerado em __DATE__.",
    disc: "Estudo de portfólio independente, sem vínculo com SPA, Banco Central, IEPS, Unifesp, DATASUS ou IBGE. As análises são do autor e não representam posição dessas instituições. Nada aqui é aconselhamento financeiro, jurídico ou de saúde."
  }
};
TXT.en = {
  dir: "by proxy", of: "of", to: "to", read: "How to read",
  nav: { panorama: "Overview", trajetoria: "Trajectory", conta: "Who pays", matematica: "The loss", economia: "The void", custo: "The toll", geografia: "Geography", dossie: "Dossier", robustez: "Robustness", apendice: "Appendix" },
  hero: {
    kicker: "Fixed-odds betting · Brazil · 2018–2026",
    sub: "A Casa Sempre Ganha · La Banca Siempre Gana",
    thesis: "Online betting drains an enormous volume of money from Brazilian households, concentrates that extraction among the poorest, returns almost nothing in jobs or useful tax revenue, and leaves behind a health toll larger than what the sector pays into public coffers. This report measures every link in that chain with official data, and shows the tension wherever it exists.",
    src: "Sources: SPA/Ministry of Finance · Central Bank (Special Study 119) · IEPS · LENAD III/Unifesp · DATASUS/SIM · IBGE/PNADC · Google Trends. Period 2018–2026. Coverage: 27 states. Method: primary-source transcription and live API collection, with caching. Author: Avner Paes Gomes · July 2026.",
    strip: [
      { v: "R$37bn", l: "gross gaming revenue (GGR) in 2025", tone: "" },
      { v: "25.2M", l: "Brazilians placed bets in 2025", tone: "" },
      { v: "R$38.8bn", l: "annual social and health cost (IEPS)", tone: "" },
      { v: "1,144", l: "formal jobs in the entire betting sector", tone: "ok" }
    ]
  },
  sec: {
    panorama: {
      eyebrow: "Overview", title: "The size of the machine",
      lede: "In a single year of a regulated market, fixed-odds betting moved tens of billions of reais and reached one in six adults. The sector is large, new and concentrated.",
      prose: [
        "<span class='lead-in'>The market was born huge.</span> According to the Ministry of Finance betting authority, licensed operators booked gross gaming revenue (the <span class='term' tabindex='0' data-tip='GGR (Gross Gaming Revenue): total wagered minus prizes paid. It is what the house keeps before costs and taxes.'>GGR</span>) of about <b>R$37 billion in 2025</b>, with <b>25.2 million</b> bettors across <b>79 licensed operators</b>. In the first half alone, GGR reached R$17.4 billion and 17.7 million people bet.",
        "GGR is not how much Brazilians wagered. It is what the house kept after paying out prizes. The total transacted is far larger: the Central Bank measured <b>between R$18 and R$21 billion a month</b> in Pix transfers to betting operators in early 2025. The money that flows in is money leaving household budgets."
      ],
      cap: "<b>The sector funnel in 2025.</b> Left to right: estimated monthly Pix flow to betting, the annual gross revenue kept by the house (GGR), and public tax revenue. Each bar is a fraction of the last. Read it as a funnel: almost everything that flows in stays with the sector, little reaches the state.",
      stats: [
        { v: "R$20bn", l: "a month in Pix to betting", n: "Central Bank, Q1 2025", tone: "" },
        { v: "79", l: "licensed operators", n: "SPA/MF, 2025", tone: "ink" },
        { v: "1 in 6", l: "adults placed a bet", n: "17.7M in H1 2025", tone: "amber" },
        { v: "R$8.8bn", l: "tax collected in 2025", n: "12% of GGR (Law 14,790/2023)", tone: "ok" }
      ],
      pull: "The house does not gamble. The house collects."
    },
    trajetoria: {
      eyebrow: "Trajectory", title: "The rise of a brand-new curve",
      lede: "Legalized in 2018, pushed by the tigrinho in 2023 and regulated in 2025, online betting became a high-frequency habit. Search interest tracks paydays, benefits and big events.",
      prose: [
        "<span class='lead-in'>A recent history of fast acceleration.</span> The 2018 <span class='term' tabindex='0' data-tip='Law 13,756/2018 legalized fixed-odds betting; Law 14,790/2023 regulated the sector and set the 12% rate on GGR.'>Law 13,756</span> legalized fixed-odds betting, but it was between 2023 and 2025, with the <span class='term' tabindex='0' data-tip='Jogo do tigrinho (Fortune Tiger): an online slot-style casino game that went viral in Brazil in 2023 and became a popular byword for bets.'>tigrinho slot</span> and the start of the regulated market, that betting became a mass phenomenon. Google Trends search interest serves as a high-frequency signal for this trajectory, since monthly spend by region is not public.",
        "The pattern is not noise. Interest rises around paydays and spikes around major sporting events. When the Central Bank overlaid the calendar, it found transfer peaks aligned with salary and social-benefit credit days, the picture of a consumption that competes directly with the household budget."
      ],
      cap: "<b>Search interest in betting terms in Brazil, 2019–2026.</b> Google Trends index (0–100, relative to each term's peak). Vertical marks flag events: regulation, market launch, World Cup. How to read: the line is a proxy for attention and demand, not for amount wagered; it dates the acceleration, it does not measure spend.",
      cap_stl: "<b>Seasonal decomposition (STL) of interest in 'bet'.</b> The observed series is split into an underlying trend and a seasonal component that repeats each year. How to read: the trend shows structural growth; the seasonality shows the pulse of the calendar.",
      stats: [
        { v: "2018", l: "legalization (Law 13,756)", n: "fixed-odds authorized", tone: "ink" },
        { v: "2023", l: "the tigrinho goes viral", n: "betting becomes a mass habit", tone: "amber" },
        { v: "2025", l: "regulated market begins", n: "bet.br domain, 79 operators", tone: "ink" }
      ],
      pull: "Chance is the product. Loss is the business model."
    },
    conta: {
      eyebrow: "Who pays the bill", title: "The bill runs down the income ladder",
      lede: "Risky gambling is not spread evenly. It concentrates where money is tightest. The lower the income, the larger the share of bettors in risky use. This is the moral axis of the report.",
      prose: [
        "<span class='lead-in'>Regressivity is the sector's signature.</span> <span class='term' tabindex='0' data-tip='LENAD III: Third National Survey on Alcohol and Drugs, Unifesp/INPAD with the Ministry of Justice, 2025. National sample of 16,608 people aged 14 and over.'>LENAD III</span> estimated that <b>7.3% of Brazilians aged 14 and over</b> gamble in a risky or problematic way, roughly <b>10.9 million people</b>, and that <b>0.8%</b> already meet criteria for gambling disorder, close to 1.4 million. Among those who bet in the past year, risk falls as income rises: below one minimum wage, more than half are in risky use.",
        "The Central Bank reached the same ground by another road. In August 2024, <span class='term' tabindex='0' data-tip='Bolsa Família: Brazil's main cash-transfer program, aimed at families living in poverty.'>Bolsa Família</span> recipients transferred about <b>R$3 billion</b> via Pix to betting houses in a single month, and <b>17% of CadÚnico registrants</b> bet in the period. Money designed to lift families out of poverty leaked, in part, into the spin of a slot machine."
      ],
      cap: "<b>Risky use among bettors, by personal income band (LENAD III).</b> Each bar is the share of past-year bettors in risky or problematic use within the income band. How to read: the bar shrinks as income rises. Regressivity is not rhetoric, it is a gradient.",
      stats: [
        { v: "10.9M", l: "in risky betting use", n: "7.3% of the 14+ population (LENAD III)", tone: "" },
        { v: "R$3bn", l: "of Bolsa Família in bets", n: "via Pix, August 2024 (Central Bank)", tone: "" },
        { v: "17%", l: "of CadÚnico registrants bet", n: "Central Bank, Special Study 119", tone: "amber" },
        { v: "55%", l: "of teen bettors in risky use", n: "ages 14–17 (LENAD III)", tone: "" }
      ],
      pull: "The tighter the pocket, the heavier the wager."
    },
    matematica: {
      eyebrow: "The math of loss", title: "The house edge is not luck, it is design",
      lede: "Every betting game returns less than it takes. With a 93% return to player, each real wagered loses seven cents, always. We simulated the bankroll of twenty thousand bettors to show what that becomes over time.",
      prose: [
        "<span class='lead-in'>The loss is structural, not bad luck.</span> The typical <span class='term' tabindex='0' data-tip='RTP (Return to Player): the fraction of the amount wagered that, over the long run, returns to bettors as a group. A 93% RTP means a 7% margin guaranteed to the house.'>RTP</span> of an online casino game sits around 93%. We ran a <span class='term' tabindex='0' data-tip='Monte Carlo: a method that repeats a random process thousands of times to estimate the distribution of possible outcomes.'>Monte Carlo</span> simulation with twenty thousand bettors, a starting bankroll of R$500 and R$20 bets on a game with a 93% RTP. The result is relentless: at the median, the bankroll reaches zero.",
        "It is not that no one wins. A minority is ahead at any given moment. But the aggregate is a subtraction machine: over three hundred bets, more than half of the paths go bust, and only about one in ten ends above where it started. The house does not need to cheat. The margin does the work."
      ],
      cap: "<b>Simulated bankroll of 20,000 bettors over 300 bets (93% RTP).</b> The band shows the 5th, 25th, 50th, 75th and 95th percentiles of the bankroll; the red line is the ruin curve (share already bust). How to read: the median bankroll falls to zero; the probability of ruin only grows. Time is the house's ally.",
      stats: [
        { v: "93%", l: "return to player (RTP)", n: "7% margin guaranteed to the house", tone: "amber" },
        { v: "R$0", l: "median bankroll after 300 bets", n: "Monte Carlo simulation", tone: "" },
        { v: "54%", l: "of bettors go bust", n: "bankroll reaches zero", tone: "" },
        { v: "10%", l: "end in profit", n: "the rest lose all or part", tone: "ok" }
      ],
      pull: "You can win a bet. You cannot win the math."
    },
    economia: {
      eyebrow: "The economic void", title: "A lot of money, almost no jobs",
      lede: "The sector's defense promises economy and jobs. The formal records tell another story: a handful of positions, wages that vanish against revenue, and tax revenue small next to the cost it generates.",
      prose: [
        "<span class='lead-in'>The promised jobs do not show up in the records.</span> The IEPS dossier, drawing on the 2024 <span class='term' tabindex='0' data-tip='RAIS: the Annual Social Information Report, an administrative record of formal employment in Brazil run by the Ministry of Labor.'>RAIS</span>, found only <b>1,144 formal jobs</b> in the entire betting sector, spread across 60 employers. For comparison, a single mid-sized shopping mall employs more people. And wages vanish against revenue: for every <b>R$291</b> that comes in, only <b>R$1</b> becomes a worker's pay.",
        "Tax revenue is also modest next to the trail it leaves. The sector collected about R$8.8 billion in 2025, of which only <b>1% is earmarked by law for the Ministry of Health</b>. On the other side of the ledger sits the social cost estimated at R$38.8 billion a year. The industry pushes back and cites 15,000 direct and indirect jobs and R$28 billion injected; even granting the more generous figure, the health bill still exceeds the economic one."
      ],
      cap: "<b>Where the R$291 in revenue goes.</b> For every R$291 of sector revenue, R$1 becomes a formal wage. The large bar is retained revenue; the thread on the right is paid labor. How to read: the disproportion is the point. The sector churns money, it does not create work.",
      stats: [
        { v: "1,144", l: "formal jobs in the sector", n: "RAIS 2024, 60 employers", tone: "ok" },
        { v: "R$1 : R$291", l: "wage per revenue", n: "1 real of wage per 291 of revenue", tone: "" },
        { v: "84%", l: "of workers without social security", n: "national average is 36%", tone: "" },
        { v: "1%", l: "of revenue goes to Health", n: "against R$38.8bn in cost", tone: "" }
      ],
      pull: "A sector that moves billions and pays a thousand wages is not an economy. It is a pipe."
    },
    custo: {
      eyebrow: "The human toll", title: "The toll that never shows on the receipt",
      lede: "The sector's price is not paid at the betting counter. It is paid in the emergency room, the clinic and the funeral. And the curve of suicide deaths has risen alongside the spread of gambling.",
      prose: [
        "<span class='lead-in'>The harm has a number, and it is large.</span> IEPS estimated the social and health cost of betting at <b>R$38.8 billion a year</b>, of which <b>R$30.6 billion</b>, nearly 79%, tied directly to health. The largest slice, <b>R$17 billion</b>, corresponds to additional suicide deaths associated with problem gambling; another <b>R$13.4 billion</b> to depression. These are outcomes associated with gambling, with no claim of causation, but the international literature is consistent: gambling disorder raises mortality and multiplies suicide risk.",
        "Data from the <span class='term' tabindex='0' data-tip='SIM: the Mortality Information System of the Ministry of Health, the official record of deaths in Brazil by cause (ICD-10).'>SIM/DATASUS</span> show the backdrop. Deaths from intentional self-harm (ICD-10 X60–X84) rose from about 11,000 a year in the mid-2010s to more than 17,000 in the most recent consolidated data, an increase above 50%. Gambling's spread is not the sole cause of that curve, but it rides on top of it, and the cost estimated by IEPS is precisely that attributable fraction."
      ],
      cap: "<b>Deaths from intentional self-harm (suicide, ICD-10 X60–X84) in Brazil, by year.</b> Annual count from SIM/DATASUS, summed by state of residence. How to read: the curve rises persistently; the report attributes to gambling only the fraction estimated by IEPS, not the total.",
      cap_cost: "<b>Composition of the R$38.8 billion annual social cost (IEPS).</b> Each segment is a component of harm. How to read: health dominates; suicide alone accounts for nearly half. What is left out, such as the money families lose, would make the bar larger.",
      stats: [
        { v: "R$30.6bn", l: "health-related cost per year", n: "78.8% of the social cost (IEPS)", tone: "" },
        { v: "R$17bn", l: "attributed to suicide", n: "nearly half the total cost", tone: "" },
        { v: "+52%", l: "in suicide deaths 2015–2023", n: "SIM/DATASUS (X60–X84)", tone: "" },
        { v: "537×", l: "cost to the health system vs. bets' transfer", n: "R$30.6bn vs. ~R$57M/year", tone: "" }
      ],
      pull: "The luck is private. The harm is public."
    },
    geografia: {
      eyebrow: "Geography", title: "A map you can only read by proxy",
      lede: "Where do people bet most? The Central Bank declared municipal spend for internal use. Without it, we cross search intensity, suicide, mental-health capacity and income by state. The associations are spatial, not causal.",
      prose: [
        "<span class='lead-in'>Honesty here is the method.</span> There is no public statistic for the amount wagered by state or municipality: the Central Bank stated that this breakdown is for internal use. So this map works by <b>proxy</b>. Google Trends search intensity for betting terms is the best open indicator of geographic attention, and we cross it with the suicide rate (SIM), the mental-health network (CAPS/CNES) and household income per capita (IBGE/PNADC).",
        "The reader should keep the <span class='term' tabindex='0' data-tip='Ecological fallacy: the error of inferring about individuals from group averages. A correlation between states does not prove a relationship at the level of people.'>ecological fallacy</span> in mind. A state with more searches and more suicides does not prove one causes the other, nor that they are the same people. These are patterns across territory, useful for raising hypotheses and dangerous for drawing conclusions. Switch the layer with the buttons and watch each indicator redraw the country."
      ],
      cap: "<b>Choropleth of the 27 states.</b> Choose the layer: search intensity (betting proxy), suicide rate per 100,000, CAPS per 100,000 inhabitants, or income per capita. How to read: stronger tones mark higher values. Associations are spatial and not causal; read them as hypothesis, not proof.",
      cap_corr: "<b>Correlation across states (Spearman, n=27).</b> Coefficients between search, suicide and income, with a 95% bootstrap interval. How to read: bars to the right mean positive association, to the left negative; an interval crossing zero is inconclusive.",
      layers: { search: "Search (proxy)", suicide: "Suicide /100k", caps: "CAPS /100k", income: "Income per capita" },
      pull: "The territory suggests. It does not confess."
    },
    dossie: {
      eyebrow: "Dossier · Regulation in dispute", title: "What the state does, and what it hesitates to do",
      lede: "Betting regulation is being written right now, between a parliamentary inquiry whose report was rejected, a bill to double the tax, and a line of more than 200,000 people asking to be blocked from themselves.",
      prose: [
        "<span class='lead-in'>Congress measured the problem and stepped back.</span> The Senate's <span class='term' tabindex='0' data-tip='CPI: a Parliamentary Inquiry Commission, a legislative instrument to investigate specific facts.'>Betting Inquiry</span> ended with its final report rejected, the first rejection of a final inquiry report in the Senate in about a decade. In parallel, Bill 5473/2025 proposes to <b>double the rate</b> on GGR, from 12% to 24%. And the most eloquent answer came from the public itself: the federal self-exclusion platform received <b>more than 217,000 requests in 40 days</b>, and 37% of them cited loss of control tied to mental health.",
        "The contrast with the United Kingdom is instructive. There, the <span class='term' tabindex='0' data-tip='OHID: the UK Office for Health Improvement and Disparities, whose estimate of gambling-harm costs underpinned the IEPS methodology.'>OHID</span> estimated the cost of gambling harms, advertising restrictions were adopted, and a statutory levy funds prevention and treatment. It is the model from which IEPS carefully transferred its cost methodology to Brazil."
      ],
      scn: [
        { cls: "down", h: "Inquiry rejected", p: "The final report of the Betting Inquiry was rejected in the Senate, the first rejection of an inquiry report in the house in about ten years. The diagnosis existed; the political conclusion did not." },
        { cls: "up", h: "Bill 5473/2025", p: "The bill proposes doubling the rate on GGR from 12% to 24%, bringing taxation closer to the social cost. Still under debate." },
        { cls: "", h: "Self-exclusion", p: "The federal self-exclusion platform (launched 10 Dec 2025) gathered more than 217,000 requests in 40 days; 37% cited loss of control tied to mental health." },
        { cls: "", h: "The British model", p: "United Kingdom: cost estimate by OHID, advertising restrictions and a statutory levy for prevention and treatment. The reference for the IEPS methodology." }
      ],
      evid_title: "Academic evidence",
      evid_lede: "References located by the paper-lookup scientific search protocol (k-dense scientific-agent-skills) over the OpenAlex base, each with a DOI verified in OpenAlex and confirmed in CrossRef, with no fabrication.",
      pull: "Two hundred thousand people asked to be protected from a legal product."
    },
    robustez: {
      eyebrow: "Robustness", title: "What the estimate includes, and what it leaves out",
      lede: "The R$38.8 billion figure is conservative by construction. It was transferred from the United Kingdom by purchasing power parity and excludes real harms it could not measure. Showing that is part of the rigor.",
      prose: [
        "<span class='lead-in'>An honest estimate declares its limits.</span> The IEPS social cost was not invented for Brazil: it was transferred from the British <span class='term' tabindex='0' data-tip='Purchasing power parity (PPP): an adjustment that compares values across countries by what each currency actually buys, not by the exchange rate.'>OHID</span> estimates by purchasing power parity, a deliberately conservative choice. And even so, it leaves out harm components for lack of evidence robust enough to price.",
        "Left out, among others, are harms to relationships and family bonds, domestic violence, lost productivity at work and, above all, <b>the very money families lose betting</b>. In other words: the largest income transfer of the problem, from families to betting houses, is not even counted in the R$38.8 billion. The figure is a floor, not a ceiling."
      ],
      cap: "<b>What goes in and what stays out of the cost estimate.</b> On the left, counted components (suicide, depression, housing, unemployment insurance, incarceration). On the right, harms recognized but not priced. How to read: the exclusions column is why the estimate is a floor.",
      incl_title: "Counted",
      excl_title: "Recognized, not priced",
      incl: ["Suicide deaths (R$17bn)", "Depression: quality of life and treatment (R$13.4bn)", "Loss of housing (R$1.3bn)", "Unemployment insurance (R$2.1bn)", "Incarceration for criminal activity (R$4.7bn)"],
      excl: ["The money families lose betting", "Harm to relationships and family bonds", "Associated domestic violence", "Lost productivity at work", "Long-term effects on children and adolescents"],
      caveats_title: "Declared cautions",
      caveats: ["Methodological break: the market is only regulated and measured from 2025; earlier series mix CNAE codes.", "Geographic proxy: municipal spend is internal at the Central Bank; we use Google Trends search.", "Ecological fallacy: cross-state correlations are spatial, not individual or causal.", "International transfer: health costs come from the UK OHID adjusted by PPP.", "Association, not cause: the health outcomes are associated with problem gambling."],
      pull: "Where doubt exists, the report shows the doubt."
    },
    apendice: {
      eyebrow: "Appendix", title: "The 27 states, side by side",
      lede: "Search index, suicide rate, mental-health network and income by state. Click a header to reorder and see which states lead each axis.",
      cols: { uf: "State", name: "Name", search: "Search (0–100)", suicide: "Suicide /100k", caps: "CAPS /100k", income: "Income (R$)" },
      cap: "<b>Sortable table by state.</b> Search: Google Trends index (betting proxy). Suicide: X60–X84 deaths per 100,000 inhabitants (SIM). CAPS: units per 100,000 (CNES). Income: household per capita (PNADC). Click the headers to sort."
    }
  },
  foot: {
    title: "The House Always Wins",
    method: "Methodology: figures transcribed from primary sources (SPA/MF, Central Bank Special Study 119, IEPS, LENAD III/Unifesp) and collected live via API with on-disk caching (DATASUS/SIM and CNES via TABNET, IBGE/PNADC via SIDRA, Google Trends via pytrends). Main statistical model: Monte Carlo simulation of the bettor's bankroll (93% RTP, 20,000 paths); supplements: STL seasonal decomposition and Spearman correlations across states with bootstrap intervals. Literature review by the paper-lookup protocol over OpenAlex, with verified DOIs.",
    sources: "Sources: Betting Authority/Ministry of Finance; Central Bank of Brazil (Special Study 119); IEPS, dossier 'The health of Brazilians at stake'; LENAD III (Unifesp/INPAD and Ministry of Justice); DATASUS (SIM, CNES); IBGE (Continuous PNAD); Google Trends.",
    offline: "Self-contained, offline report: all CSS, JavaScript and data are embedded in this single file, with no external runtime dependencies. Generated on __DATE__.",
    disc: "Independent portfolio study, with no affiliation to SPA, the Central Bank, IEPS, Unifesp, DATASUS or IBGE. The analyses are the author's and do not represent the position of those institutions. Nothing here is financial, legal or health advice."
  }
};
TXT.es = {
  dir: "por proxy", of: "de", to: "a", read: "Cómo leer",
  nav: { panorama: "Panorama", trajetoria: "Trayectoria", conta: "Quién paga", matematica: "La pérdida", economia: "El vacío", custo: "El costo", geografia: "Geografía", dossie: "Dosier", robustez: "Robustez", apendice: "Apéndice" },
  hero: {
    kicker: "Apuestas de cuota fija · Brasil · 2018–2026",
    sub: "A Casa Sempre Ganha · The House Always Wins",
    thesis: "Las apuestas en línea drenan un volumen enorme de dinero de los hogares brasileños, concentran esa extracción en los más pobres, devuelven casi nada en empleo y en recaudación útil, y dejan un costo sanitario mayor que lo que el sector aporta a las arcas públicas. Este informe mide cada eslabón de esa cadena con datos oficiales, y muestra la tensión donde existe.",
    src: "Fuentes: SPA/Ministerio de Hacienda · Banco Central (Estudio Especial 119) · IEPS · LENAD III/Unifesp · DATASUS/SIM · IBGE/PNADC · Google Trends. Período 2018–2026. Cobertura: 27 estados. Método: transcripción de fuentes primarias y recolección viva por API, con caché. Autor: Avner Paes Gomes · Julio de 2026.",
    strip: [
      { v: "R$ 37 mm", l: "de ingreso bruto del sector (GGR) en 2025", tone: "" },
      { v: "25,2 mi", l: "de brasileños apostaron en 2025", tone: "" },
      { v: "R$ 38,8 mm", l: "de costo social y sanitario al año (IEPS)", tone: "" },
      { v: "1.144", l: "empleos formales en todo el sector de apuestas", tone: "ok" }
    ]
  },
  sec: {
    panorama: {
      eyebrow: "Panorama", title: "El tamaño de la máquina",
      lede: "En un solo año de mercado regulado, las apuestas de cuota fija movieron decenas de miles de millones de reales y alcanzaron a uno de cada seis adultos. El sector es grande, nuevo y concentrado.",
      prose: [
        "<span class='lead-in'>El mercado nació enorme.</span> Según los panoramas de la Secretaría de Premios y Apuestas del Ministerio de Hacienda, las empresas autorizadas registraron un ingreso bruto de juego (el <span class='term' tabindex='0' data-tip='GGR (Gross Gaming Revenue): el total apostado menos los premios pagados. Es lo que retiene la banca antes de costos e impuestos.'>GGR</span>) de cerca de <b>R$ 37 mil millones en 2025</b>, con <b>25,2 millones</b> de apostadores y <b>79 operadoras</b> con licencia. Solo en el primer semestre fueron R$ 17,4 mil millones de GGR y 17,7 millones de apostadores.",
        "El GGR no es cuánto apostó el brasileño. Es cuánto retuvo la banca tras pagar los premios. El valor total transaccionado es mucho mayor: el Banco Central midió <b>entre R$ 18 y R$ 21 mil millones al mes</b> en transferencias por Pix a operadoras de apuestas a inicios de 2025. El dinero que entra es el dinero que sale del presupuesto de las familias."
      ],
      cap: "<b>El embudo del sector en 2025.</b> De izquierda a derecha: el flujo mensual estimado de Pix hacia las apuestas, el ingreso bruto anual retenido por la banca (GGR) y la recaudación pública. Cada barra es una fracción de la anterior. Léalo como un embudo: casi todo lo que entra se queda con el sector, poco llega al Estado.",
      stats: [
        { v: "R$ 20 mm", l: "por mes en Pix a las apuestas", n: "Banco Central, 1er trim. 2025", tone: "" },
        { v: "79", l: "operadoras autorizadas", n: "SPA/MF, 2025", tone: "ink" },
        { v: "1 de 6", l: "adultos apostaron", n: "17,7 mi en el 1er semestre de 2025", tone: "amber" },
        { v: "R$ 8,8 mm", l: "de recaudación en 2025", n: "12% del GGR (Ley 14.790/2023)", tone: "ok" }
      ],
      pull: "La banca no apuesta. La banca recauda."
    },
    trajetoria: {
      eyebrow: "Trayectoria", title: "El ascenso de una curva nueva",
      lede: "Legalizada en 2018, empujada por el tigrinho en 2023 y regulada en 2025, la apuesta en línea se volvió un hábito de alta frecuencia. El interés de búsqueda sigue a los salarios, los beneficios y los grandes eventos.",
      prose: [
        "<span class='lead-in'>Una historia reciente, de rápida aceleración.</span> La <span class='term' tabindex='0' data-tip='Ley 13.756/2018 legalizó las apuestas de cuota fija; la Ley 14.790/2023 reguló el sector y fijó la tasa del 12% sobre el GGR.'>Ley 13.756</span> de 2018 legalizó las apuestas de cuota fija, pero fue entre 2023 y 2025, con el <span class='term' tabindex='0' data-tip='Jogo do tigrinho (Fortune Tiger): un juego de casino en línea tipo tragamonedas que se viralizó en Brasil en 2023 y se volvió sinónimo popular de las apuestas.'>juego del tigrinho</span> y el inicio del mercado regulado, que la apuesta se volvió fenómeno de masas. La serie de interés de búsqueda de Google Trends sirve de señal de alta frecuencia para esa trayectoria, ya que el gasto mensual por región no es público.",
        "El patrón no es ruido. El interés sube cerca de las fechas de pago y se dispara en torno a los grandes eventos deportivos. Cuando el Banco Central cruzó el calendario, encontró picos de transferencias alineados con los días de acreditación de salario y de beneficio social, el retrato de un consumo que compite directamente con el presupuesto del hogar."
      ],
      cap: "<b>Interés de búsqueda por términos de apuesta en Brasil, 2019–2026.</b> Índice de Google Trends (0–100, relativo al pico de cada término). Las marcas verticales señalan eventos: regulación, inicio del mercado y Mundial. Cómo leer: la línea es proxy de atención y demanda, no del valor apostado; sirve para datar la aceleración, no para medir el gasto.",
      cap_stl: "<b>Descomposición estacional (STL) del interés por 'bet'.</b> La serie observada se separa en tendencia de fondo y componente estacional que se repite cada año. Cómo leer: la tendencia muestra el crecimiento estructural; la estacionalidad muestra el pulso del calendario.",
      stats: [
        { v: "2018", l: "legalización (Ley 13.756)", n: "cuota fija autorizada", tone: "ink" },
        { v: "2023", l: "el tigrinho se viraliza", n: "la apuesta se vuelve masiva", tone: "amber" },
        { v: "2025", l: "empieza el mercado regulado", n: "dominio bet.br, 79 operadoras", tone: "ink" }
      ],
      pull: "El azar es el producto. La pérdida es el modelo de negocio."
    },
    conta: {
      eyebrow: "Quién paga la cuenta", title: "La cuenta baja por la renta",
      lede: "El juego de riesgo no se reparte por igual. Se concentra donde el dinero es más escaso. Cuanto menor la renta, mayor la porción de apostadores en uso arriesgado. Este es el eje moral del informe.",
      prose: [
        "<span class='lead-in'>La regresividad es la firma del sector.</span> La <span class='term' tabindex='0' data-tip='LENAD III: III Encuesta Nacional de Alcohol y Drogas, Unifesp/INPAD con el Ministerio de Justicia, 2025. Muestra nacional de 16.608 personas de 14 años o más.'>LENAD III</span> estimó que <b>el 7,3% de los brasileños de 14 años o más</b> apuesta de forma arriesgada o problemática, cerca de <b>10,9 millones de personas</b>, y que el <b>0,8%</b> ya cumple criterio de trastorno del juego, cerca de 1,4 millón. Entre quienes apostaron en el último año, el riesgo baja a medida que sube la renta: en el tramo de menos de un salario mínimo, más de la mitad está en uso de riesgo.",
        "El Banco Central llegó al mismo terreno por otro camino. En agosto de 2024, beneficiarios de <span class='term' tabindex='0' data-tip='Bolsa Família: el principal programa de transferencia de renta de Brasil, dirigido a familias en situación de pobreza.'>Bolsa Família</span> transfirieron cerca de <b>R$ 3 mil millones</b> por Pix a casas de apuestas en un solo mes, y el <b>17% de los inscritos en el CadÚnico</b> apostó en el período. El dinero diseñado para sacar a las familias de la pobreza se fugó, en parte, hacia el giro de una tragamonedas."
      ],
      cap: "<b>Uso de riesgo entre apostadores, por tramo de renta personal (LENAD III).</b> Cada barra es la porción de apostadores del último año en uso de riesgo o problemático dentro del tramo de renta. Cómo leer: la barra se encoge a medida que sube la renta. La regresividad no es retórica, es gradiente.",
      stats: [
        { v: "10,9 mi", l: "en uso arriesgado de apuestas", n: "7,3% de la población 14+ (LENAD III)", tone: "" },
        { v: "R$ 3 mm", l: "de Bolsa Família en apuestas", n: "por Pix, agosto de 2024 (BCB)", tone: "" },
        { v: "17%", l: "de los inscritos en CadÚnico apostó", n: "Banco Central, EE119", tone: "amber" },
        { v: "55%", l: "de los adolescentes que apuestan en riesgo", n: "tramo 14–17 años (LENAD III)", tone: "" }
      ],
      pull: "Cuanto más corto el bolsillo, más pesada la apuesta."
    },
    matematica: {
      eyebrow: "La matemática de la pérdida", title: "La ventaja de la banca no es suerte, es diseño",
      lede: "Todo juego de apuesta devuelve menos de lo que recauda. Con un retorno al apostador del 93%, cada real girado pierde siete centavos, siempre. Simulamos el saldo de veinte mil apostadores para mostrar en qué se convierte con el tiempo.",
      prose: [
        "<span class='lead-in'>La pérdida es estructural, no es azar.</span> El <span class='term' tabindex='0' data-tip='RTP (Return to Player): la fracción del valor apostado que, a largo plazo, vuelve al conjunto de los apostadores. Un RTP del 93% significa 7% de margen garantizado para la banca.'>RTP</span> típico de un juego de casino en línea ronda el 93%. Corrimos una simulación de <span class='term' tabindex='0' data-tip='Monte Carlo: método que repite un proceso aleatorio miles de veces para estimar la distribución de resultados posibles.'>Monte Carlo</span> con veinte mil apostadores, saldo inicial de R$ 500 y apuestas de R$ 20 en un juego con RTP del 93%. El resultado es implacable: en la mediana, el saldo llega a cero.",
        "No es que nadie gane. Una minoría termina en verde en cualquier instante dado. Pero el agregado es una máquina de sustracción: a lo largo de trescientas apuestas, más de la mitad de las trayectorias se arruina, y apenas cerca de uno de cada diez termina por encima de donde empezó. La banca no necesita hacer trampa. El margen hace el trabajo."
      ],
      cap: "<b>Saldo simulado de 20.000 apostadores a lo largo de 300 apuestas (RTP 93%).</b> La franja muestra los percentiles 5, 25, 50, 75 y 95 del saldo; la línea roja es la curva de ruina (porcentaje ya en quiebra). Cómo leer: el saldo mediano baja hasta cero; la probabilidad de ruina solo crece. El tiempo es aliado de la banca.",
      stats: [
        { v: "93%", l: "de retorno al apostador (RTP)", n: "7% de margen garantizado a la banca", tone: "amber" },
        { v: "R$ 0", l: "saldo mediano tras 300 apuestas", n: "simulación Monte Carlo", tone: "" },
        { v: "54%", l: "de los apostadores se arruina", n: "el saldo llega a cero", tone: "" },
        { v: "10%", l: "terminan en ganancia", n: "el resto pierde todo o parte", tone: "ok" }
      ],
      pull: "Puedes ganar una apuesta. No puedes ganarle a la matemática."
    },
    economia: {
      eyebrow: "El vacío económico", title: "Mucho dinero, casi ningún empleo",
      lede: "La defensa del sector promete economía y trabajo. Los registros formales cuentan otra historia: un puñado de puestos, salarios que se esfuman ante el ingreso, y una recaudación pequeña frente al costo que genera.",
      prose: [
        "<span class='lead-in'>El empleo prometido no aparece en los registros.</span> El dosier del IEPS, a partir de la <span class='term' tabindex='0' data-tip='RAIS: Relación Anual de Informaciones Sociales, registro administrativo del Ministerio de Trabajo con el vínculo formal de empleo en Brasil.'>RAIS</span> de 2024, encontró apenas <b>1.144 empleos formales</b> en todo el sector de apuestas, repartidos entre 60 empleadores. A modo de comparación, un solo centro comercial mediano emplea a más gente. Y el salario se esfuma ante el ingreso: por cada <b>R$ 291</b> que entran, apenas <b>R$ 1</b> se vuelve remuneración de trabajador.",
        "La recaudación también es modesta ante el rastro que deja. El sector recaudó cerca de R$ 8,8 mil millones en 2025, de los cuales solo el <b>1% se destina por ley al Ministerio de Salud</b>. Del otro lado del balance está el costo social estimado en R$ 38,8 mil millones al año. La industria lo cuestiona y habla de 15 mil empleos directos e indirectos y R$ 28 mil millones inyectados; aun aceptando la cifra más generosa, la cuenta sanitaria sigue superando a la económica."
      ],
      cap: "<b>Adónde va el ingreso de R$ 291.</b> Por cada R$ 291 de ingreso del sector, R$ 1 se vuelve salario formal. La barra mayor es ingreso retenido; el hilo a la derecha es el trabajo pagado. Cómo leer: la desproporción es el punto. El sector gira dinero, no genera trabajo.",
      stats: [
        { v: "1.144", l: "empleos formales en el sector", n: "RAIS 2024, 60 empleadores", tone: "ok" },
        { v: "R$ 1 : R$ 291", l: "salario por ingreso", n: "1 real de salario por cada 291 de ingreso", tone: "" },
        { v: "84%", l: "de los trabajadores sin previsión social", n: "el promedio nacional es 36%", tone: "" },
        { v: "1%", l: "de la recaudación va a Salud", n: "ante R$ 38,8 mm de costo", tone: "" }
      ],
      pull: "Un sector que mueve miles de millones y paga mil salarios no es una economía. Es un caño."
    },
    custo: {
      eyebrow: "El costo humano", title: "El peaje que no aparece en la factura",
      lede: "El precio del sector no se paga en la caja de la casa de apuestas. Se paga en urgencias, en el consultorio y en el velorio. Y la curva de muertes por suicidio subió junto con la expansión del juego.",
      prose: [
        "<span class='lead-in'>El daño tiene un número, y es grande.</span> El IEPS estimó el costo social y sanitario de las apuestas en <b>R$ 38,8 mil millones al año</b>, de los cuales <b>R$ 30,6 mil millones</b>, casi el 79%, ligados directamente a la salud. La mayor porción, <b>R$ 17 mil millones</b>, corresponde a muertes adicionales por suicidio asociadas al juego problemático; otros <b>R$ 13,4 mil millones</b> a la depresión. Son desenlaces asociados al juego, sin afirmación de causalidad, pero la literatura internacional es consistente: el trastorno del juego eleva la mortalidad y multiplica el riesgo de suicidio.",
        "Los datos del <span class='term' tabindex='0' data-tip='SIM: Sistema de Información sobre Mortalidad del Ministerio de Salud, registro oficial de las muertes en Brasil por causa (CIE-10).'>SIM/DATASUS</span> muestran el trasfondo. Las muertes por lesiones autoinfligidas voluntariamente (CIE-10 X60–X84) pasaron de cerca de 11 mil al año a mediados de la década pasada a más de 17 mil en el dato consolidado más reciente, un alza superior al 50%. La expansión del juego no es la única causa de esa curva, pero cabalga sobre ella, y el costo estimado por el IEPS es justamente esa fracción atribuible."
      ],
      cap: "<b>Muertes por lesiones autoinfligidas (suicidio, CIE-10 X60–X84) en Brasil, por año.</b> Conteo anual del SIM/DATASUS, por estado de residencia sumado. Cómo leer: la curva sube de forma persistente; el informe atribuye al juego solo la fracción estimada por el IEPS, no el total.",
      cap_cost: "<b>Composición del costo social de R$ 38,8 mil millones al año (IEPS).</b> Cada segmento es un componente del daño. Cómo leer: la salud domina; el suicidio solo responde por casi la mitad. Lo que queda fuera, como el dinero perdido por las familias, haría la barra mayor.",
      stats: [
        { v: "R$ 30,6 mm", l: "de costo ligado a la salud al año", n: "78,8% del costo social (IEPS)", tone: "" },
        { v: "R$ 17 mm", l: "atribuidos al suicidio", n: "casi la mitad del costo total", tone: "" },
        { v: "+52%", l: "de muertes por suicidio 2015–2023", n: "SIM/DATASUS (X60–X84)", tone: "" },
        { v: "537×", l: "costo al SUS ante el aporte de las apuestas", n: "R$ 30,6 mm vs. ~R$ 57 mi/año", tone: "" }
      ],
      pull: "La suerte es privada. El daño es público."
    },
    geografia: {
      eyebrow: "Geografía", title: "Un mapa que solo se puede leer por proxy",
      lede: "¿Dónde se apuesta más? El Banco Central declaró de uso interno el gasto por municipio. Sin ese dato, cruzamos intensidad de búsqueda, suicidio, salud mental y renta por estado. Las asociaciones son espaciales, no causales.",
      prose: [
        "<span class='lead-in'>La honestidad aquí es el método.</span> No existe estadística pública del valor apostado por estado o municipio: el Banco Central afirmó que ese recorte es de uso interno. Entonces este mapa trabaja por <b>proxy</b>. La intensidad de búsqueda de Google Trends por términos de apuesta es el mejor indicador abierto de atención geográfica, y la cruzamos con la tasa de suicidio (SIM), la red de salud mental (CAPS/CNES) y la renta domiciliaria per cápita (IBGE/PNADC).",
        "El lector debe tener presente la <span class='term' tabindex='0' data-tip='Falacia ecológica: error de inferir sobre individuos a partir de promedios de grupos. Una correlación entre estados no prueba una relación a nivel de las personas.'>falacia ecológica</span>. Un estado con más búsqueda y más suicidio no prueba que una cosa cause la otra, ni que sean las mismas personas. Son patrones en el territorio, útiles para levantar hipótesis y peligrosos para concluir. Cambie la capa en los botones y vea cómo cada indicador redibuja el país."
      ],
      cap: "<b>Mapa coroplético de los 27 estados.</b> Elija la capa: intensidad de búsqueda (proxy de apuesta), tasa de suicidio por 100 mil, CAPS por 100 mil habitantes o renta per cápita. Cómo leer: los tonos más fuertes marcan valores más altos. Las asociaciones son espaciales y no causales; léalas como hipótesis, no como prueba.",
      cap_corr: "<b>Correlación entre estados (Spearman, n=27).</b> Coeficientes entre búsqueda, suicidio y renta, con intervalo del 95% por bootstrap. Cómo leer: barras a la derecha indican asociación positiva, a la izquierda negativa; el intervalo que cruza el cero es inconcluso.",
      layers: { search: "Búsqueda (proxy)", suicide: "Suicidio /100 mil", caps: "CAPS /100 mil", income: "Renta per cápita" },
      pull: "El territorio sugiere. No confiesa."
    },
    dossie: {
      eyebrow: "Dosier · Regulación en disputa", title: "Lo que el Estado hace, y lo que duda en hacer",
      lede: "La regulación de las apuestas se está escribiendo ahora, entre una comisión de investigación cuyo informe fue rechazado, un proyecto para duplicar el impuesto y una fila de más de 200 mil personas pidiendo ser bloqueadas de sí mismas.",
      prose: [
        "<span class='lead-in'>El Congreso midió el problema y retrocedió.</span> La <span class='term' tabindex='0' data-tip='CPI: Comisión Parlamentaria de Investigación, instrumento del Legislativo para investigar hechos determinados.'>CPI de las Apuestas</span> del Senado terminó con el informe final rechazado, el primer rechazo de un informe final de CPI en el Senado en cerca de una década. En paralelo, el PL 5473/2025 propone <b>duplicar la tasa</b> sobre el GGR, del 12% al 24%. Y la respuesta más elocuente vino del propio público: la plataforma federal de autoexclusión recibió <b>más de 217 mil pedidos en 40 días</b>, y el 37% de ellos citó pérdida de control ligada a la salud mental.",
        "El contraste con el Reino Unido es instructivo. Allí, el <span class='term' tabindex='0' data-tip='OHID: Office for Health Improvement and Disparities, organismo de salud pública del Reino Unido cuya estimación de costo de los daños del juego sirvió de base a la metodología del IEPS.'>OHID</span> estimó el costo de los daños del juego, se adoptaron restricciones de publicidad y una tasa estatutaria financia prevención y tratamiento. Es el modelo del cual el IEPS transfirió, con cautela, la metodología de costo para Brasil."
      ],
      scn: [
        { cls: "down", h: "CPI rechazada", p: "El informe final de la CPI de las Apuestas fue rechazado en el Senado, primer rechazo de un informe de CPI en la Casa en cerca de diez años. El diagnóstico existió; la conclusión política, no." },
        { cls: "up", h: "PL 5473/2025", p: "El proyecto propone duplicar la tasa sobre el GGR del 12% al 24%, acercando la tributación al costo social. Aún en trámite." },
        { cls: "", h: "Autoexclusión", p: "La plataforma federal de autoexclusión (lanzada el 10/12/2025) sumó más de 217 mil pedidos en 40 días; 37% por pérdida de control ligada a la salud mental." },
        { cls: "", h: "El modelo británico", p: "Reino Unido: estimación de costo por el OHID, restricción de publicidad y tasa estatutaria para prevención y tratamiento. Referencia de la metodología del IEPS." }
      ],
      evid_title: "Evidencia académica",
      evid_lede: "Referencias localizadas por el protocolo de búsqueda científica paper-lookup (k-dense scientific-agent-skills) sobre la base OpenAlex, cada una con DOI verificado en OpenAlex y confirmado en CrossRef, sin fabricación.",
      pull: "Doscientas mil personas pidieron ser protegidas de un producto legal."
    },
    robustez: {
      eyebrow: "Robustez", title: "Lo que la estimación incluye, y lo que deja fuera",
      lede: "La cifra de R$ 38,8 mil millones es conservadora por construcción. Fue transferida del Reino Unido por paridad de poder de compra y excluye daños reales que no pudo medir. Mostrar eso es parte del rigor.",
      prose: [
        "<span class='lead-in'>Una estimación honesta declara sus límites.</span> El costo social del IEPS no se inventó para Brasil: se transfirió de las estimaciones del <span class='term' tabindex='0' data-tip='Paridad de poder de compra (PPC): ajuste que compara valores entre países por lo que cada moneda efectivamente compra, no por el tipo de cambio.'>OHID británico</span> por paridad de poder de compra, una elección deliberadamente conservadora. Y, aun así, deja fuera componentes de daño por falta de evidencia lo bastante robusta para ponerles precio.",
        "Quedan fuera, entre otros, los daños a las relaciones y los vínculos familiares, la violencia doméstica, la productividad perdida en el trabajo y, sobre todo, <b>el propio dinero que las familias pierden apostando</b>. Es decir: la mayor transferencia de renta del problema, de las familias a las casas de apuestas, ni siquiera está contada en los R$ 38,8 mil millones. La cifra es un piso, no un techo."
      ],
      cap: "<b>Lo que entra y lo que queda fuera de la estimación de costo.</b> A la izquierda, componentes contabilizados (suicidio, depresión, vivienda, seguro de desempleo, encarcelamiento). A la derecha, daños reconocidos pero no valorizados. Cómo leer: la columna de exclusiones es la razón de que la estimación sea un piso.",
      incl_title: "Contabilizado",
      excl_title: "Reconocido, no valorizado",
      incl: ["Muertes por suicidio (R$ 17 mm)", "Depresión: calidad de vida y tratamiento (R$ 13,4 mm)", "Pérdida de vivienda (R$ 1,3 mm)", "Seguro de desempleo (R$ 2,1 mm)", "Encarcelamiento por actividad criminal (R$ 4,7 mm)"],
      excl: ["El dinero perdido por las familias apostando", "Daños a relaciones y vínculos familiares", "Violencia doméstica asociada", "Productividad perdida en el trabajo", "Efectos de largo plazo sobre niños y adolescentes"],
      caveats_title: "Señales de cautela declaradas",
      caveats: ["Quiebre metodológico: el mercado solo se regula y mide desde 2025; las series anteriores mezclan CNAE.", "Proxy geográfico: el gasto por municipio es de uso interno en el BC; usamos búsqueda de Google Trends.", "Falacia ecológica: las correlaciones entre estados son espaciales, no individuales ni causales.", "Transferencia internacional: los costos de salud vienen del OHID/UK ajustados por PPC.", "Asociación, no causa: los desenlaces de salud están asociados al juego problemático."],
      pull: "Cuando la duda existe, el informe muestra la duda."
    },
    apendice: {
      eyebrow: "Apéndice", title: "Los 27 estados, lado a lado",
      lede: "Índice de búsqueda, tasa de suicidio, red de salud mental y renta por estado. Haga clic en un encabezado para reordenar y ver qué estados lideran cada eje.",
      cols: { uf: "Estado", name: "Nombre", search: "Búsqueda (0–100)", suicide: "Suicidio /100k", caps: "CAPS /100k", income: "Renta (R$)" },
      cap: "<b>Tabla por estado, ordenable.</b> Búsqueda: índice de Google Trends (proxy de apuesta). Suicidio: muertes X60–X84 por 100 mil habitantes (SIM). CAPS: unidades por 100 mil (CNES). Renta: domiciliaria per cápita (PNADC). Haga clic en los encabezados para ordenar."
    }
  },
  foot: {
    title: "La Banca Siempre Gana",
    method: "Metodología: cifras transcritas de las fuentes primarias (SPA/MF, Banco Central EE119, IEPS, LENAD III/Unifesp) y recolectadas en vivo por API con caché en disco (DATASUS/SIM y CNES por TABNET, IBGE/PNADC por SIDRA, Google Trends por pytrends). Modelo estadístico principal: simulación de Monte Carlo del saldo del apostador (RTP 93%, 20.000 trayectorias); complementos: descomposición estacional STL y correlaciones de Spearman entre estados con intervalo por bootstrap. Revisión de literatura por el protocolo paper-lookup sobre la base OpenAlex, con DOI verificado.",
    sources: "Fuentes: Secretaría de Premios y Apuestas/Ministerio de Hacienda; Banco Central de Brasil (Estudio Especial 119); IEPS, dosier 'La salud de los brasileños en juego'; LENAD III (Unifesp/INPAD y Ministerio de Justicia); DATASUS (SIM, CNES); IBGE (PNAD Continua); Google Trends.",
    offline: "Informe autocontenido y sin conexión: todo el CSS, el JavaScript y los datos están incrustados en este único archivo, sin dependencias externas en tiempo de ejecución. Generado el __DATE__.",
    disc: "Estudio de portafolio independiente, sin vínculo con SPA, Banco Central, IEPS, Unifesp, DATASUS o IBGE. Los análisis son del autor y no representan la posición de esas instituciones. Nada aquí es asesoría financiera, jurídica o de salud."
  }
};

/* =========================================================
   METADADOS DAS UFs
   ========================================================= */
var UF = {
  RO:"Rondônia",AC:"Acre",AM:"Amazonas",RR:"Roraima",PA:"Pará",AP:"Amapá",TO:"Tocantins",
  MA:"Maranhão",PI:"Piauí",CE:"Ceará",RN:"Rio Grande do Norte",PB:"Paraíba",PE:"Pernambuco",
  AL:"Alagoas",SE:"Sergipe",BA:"Bahia",MG:"Minas Gerais",ES:"Espírito Santo",RJ:"Rio de Janeiro",
  SP:"São Paulo",PR:"Paraná",SC:"Santa Catarina",RS:"Rio Grande do Sul",MS:"Mato Grosso do Sul",
  MT:"Mato Grosso",GO:"Goiás",DF:"Distrito Federal"
};

/* indicadores por UF derivados dos dados brutos */
function ufMetrics() {
  var pop = (D.population && D.population.values) || {};
  var sim = D.sim || {}; var years = sim.years || [];
  var lastY = years.length ? years[years.length - 1] : null;
  var caps = (D.caps && D.caps.values) || {};
  var inc = (D.income && D.income.values) || {};
  var srch = (D.search_index && D.search_index.values) || {};
  var out = {};
  Object.keys(UF).forEach(function (u) {
    var p = pop[u] || null;
    var suic = (lastY && sim.by_uf_year && sim.by_uf_year[u]) ? sim.by_uf_year[u][lastY] : null;
    out[u] = {
      search: srch[u] != null ? srch[u] : null,
      suicide: (suic != null && p) ? +(suic / p * 100000).toFixed(1) : null,
      caps: (caps[u] != null && p) ? +(caps[u] / p * 100000).toFixed(1) : null,
      income: inc[u] != null ? Math.round(inc[u]) : null
    };
  });
  return { m: out, lastY: lastY };
}

/* =========================================================
   RENDER — estrutura das seções (texto via TXT[LANG])
   ========================================================= */
function T() { return TXT[LANG]; }

function statCards(list) {
  return '<div class="findings">' + list.map(function (s) {
    return '<div class="stat tone-' + (s.tone || 'red') + '">' +
      '<div class="stat-v">' + s.v + '</div>' +
      '<div class="stat-l">' + s.l + '</div>' +
      '<div class="stat-n">' + s.n + '</div></div>';
  }).join("") + '</div>';
}
function prose(arr) { return '<div class="prose">' + arr.map(function (p) { return "<p>" + p + "</p>"; }).join("") + "</div>"; }
function figure(id, cap) { return '<div class="fig"><div id="' + id + '"></div></div><div class="figcap">' + cap + "</div>"; }
function head(s) { return '<div class="kicker">' + s.eyebrow + "</div><h2>" + s.title + "</h2><p class='lede'>" + s.lede + "</p>"; }

function buildSections() {
  var t = T(), S = t.sec, h = [];

  // 1 Panorama
  h.push('<section id="panorama"><div class="wrap">' + head(S.panorama) +
    figure("c-funnel", S.panorama.cap) + prose(S.panorama.prose) +
    statCards(S.panorama.stats) + '<div class="pull">' + S.panorama.pull + "</div></div></section>");

  // 2 Trajetória
  h.push('<section id="trajetoria" class="alt"><div class="wrap">' + head(S.trajetoria) +
    figure("c-traj", S.trajetoria.cap) + prose(S.trajetoria.prose) +
    statCards(S.trajetoria.stats) +
    figure("c-stl", S.trajetoria.cap_stl) +
    '<div class="pull">' + S.trajetoria.pull + "</div></div></section>");

  // 3 Quem paga
  h.push('<section id="conta"><div class="wrap">' + head(S.conta) +
    figure("c-income", S.conta.cap) + prose(S.conta.prose) +
    statCards(S.conta.stats) + '<div class="pull">' + S.conta.pull + "</div></div></section>");

  // 4 Matemática
  h.push('<section id="matematica" class="alt"><div class="wrap">' + head(S.matematica) +
    figure("c-mc", S.matematica.cap) + prose(S.matematica.prose) +
    statCards(S.matematica.stats) + '<div class="pull">' + S.matematica.pull + "</div></div></section>");

  // 5 Economia
  h.push('<section id="economia"><div class="wrap">' + head(S.economia) +
    '<div class="grid2"><div>' + figure("c-split", S.economia.cap) + '</div><div>' +
    statCards(S.economia.stats) + "</div></div>" + prose(S.economia.prose) +
    '<div class="pull">' + S.economia.pull + "</div></div></section>");

  // 6 Custo humano
  h.push('<section id="custo" class="alt"><div class="wrap">' + head(S.custo) +
    figure("c-suic", S.custo.cap) + prose(S.custo.prose) +
    statCards(S.custo.stats) +
    figure("c-cost", S.custo.cap_cost) +
    '<div class="pull">' + S.custo.pull + "</div></div></section>");

  // 7 Geografia
  h.push('<section id="geografia"><div class="wrap">' + head(S.geografia) +
    '<div class="map-wrap"><div class="map-controls" id="map-ctrl"></div>' +
    '<div class="fig"><div id="map"></div><div class="legend" id="map-legend"></div></div>' +
    '<div class="figcap">' + S.geografia.cap + "</div></div>" +
    prose(S.geografia.prose) +
    figure("c-corr", S.geografia.cap_corr) +
    '<div class="pull">' + S.geografia.pull + "</div></div></section>");

  // 8 Dossiê
  var scn = '<div class="scn">' + S.dossie.scn.map(function (c) {
    return '<div class="c ' + c.cls + '"><h4>' + c.h + "</h4><p>" + c.p + "</p></div>";
  }).join("") + "</div>";
  h.push('<section id="dossie" class="dossie"><div class="wrap">' + head(S.dossie) +
    prose(S.dossie.prose) + scn +
    '<h2 style="font-size:clamp(20px,2.6vw,26px);margin:42px 0 4px">' + S.dossie.evid_title + "</h2>" +
    '<p class="lede" style="max-width:80ch;font-size:14.5px">' + S.dossie.evid_lede + "</p>" +
    '<ol class="refs" id="refs"></ol>' +
    '<div class="pull">' + S.dossie.pull + "</div></div></section>");

  // 9 Robustez
  var inc = '<div class="scn"><div class="c up"><h4>' + S.robustez.incl_title + "</h4><p>" +
    S.robustez.incl.map(function (x) { return "• " + x; }).join("<br>") + "</p></div>" +
    '<div class="c down"><h4>' + S.robustez.excl_title + "</h4><p>" +
    S.robustez.excl.map(function (x) { return "• " + x; }).join("<br>") + "</p></div></div>";
  var cav = '<div class="callout warn"><b>' + S.robustez.caveats_title + "</b><br>" +
    S.robustez.caveats.map(function (x) { return "• " + x; }).join("<br>") + "</div>";
  h.push('<section id="robustez" class="alt"><div class="wrap">' + head(S.robustez) +
    figure("c-inclexcl", S.robustez.cap) + prose(S.robustez.prose) + inc + cav +
    '<div class="pull">' + S.robustez.pull + "</div></div></section>");

  // 10 Apêndice
  h.push('<section id="apendice"><div class="wrap">' + head(S.apendice) +
    '<div id="apx"></div>' + '<div class="figcap">' + S.apendice.cap + "</div></div></section>");

  document.getElementById("main").innerHTML = h.join("");
}

/* =========================================================
   TEXTO ESTÁTICO (nav, hero, footer)
   ========================================================= */
function applyStatic() {
  var t = T();
  document.querySelectorAll("[data-t]").forEach(function (e) {
    var path = e.getAttribute("data-t").split(".");
    var v = t; path.forEach(function (k) { v = v ? v[k] : null; });
    if (v == null) return;
    if (path[path.length - 1] === "offline") v = v.replace("__DATE__", (D.manual && D.manual.generated) || D.generated_at || "2026");
    e.innerHTML = v;
  });
  // hero strip
  document.getElementById("hero-strip").innerHTML = t.hero.strip.map(function (s) {
    return '<div class="hs ' + (s.tone === "ok" ? "ok" : "") + '"><div class="v">' + s.v + '</div><div class="l">' + s.l + "</div></div>";
  }).join("");
  document.documentElement.lang = LANG;
}

/* =========================================================
   GRÁFICOS SVG
   ========================================================= */
function frame(id, W, H) {
  var c = document.getElementById(id);
  if (!c) return null;
  c.innerHTML = "";
  var s = svg(W, H); c.appendChild(s);
  return { s: s, W: W, H: H };
}
function line(x1, y1, x2, y2, stroke, w, dash) {
  return el("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: stroke, "stroke-width": w || 1, "stroke-dasharray": dash || "none" });
}
function rect(x, y, w, h, fill, extra) { return el("rect", Object.assign({ x: x, y: y, width: Math.max(0, w), height: Math.max(0, h), fill: fill }, extra || {})); }
function pathEl(d, attrs) { return el("path", Object.assign({ d: d }, attrs)); }

/* 1. Funil: dinheiro das famílias -> GGR -> arrecadação */
function chartFunnel() {
  var f = frame("c-funnel", 720, 300); if (!f) return;
  var mk = (M && M.market) || {};
  var pixMo = ((mk.pix_mensal_bi_min || 18) + (mk.pix_mensal_bi_max || 21)) / 2;
  var rows = [
    { l: { pt: "Saída das famílias (Pix, anualizado)", en: "Household outflow (Pix, annualized)", es: "Salida de los hogares (Pix, anualizado)" }, v: pixMo * 12, c: C.red },
    { l: { pt: "Receita retida pela casa (GGR)", en: "Revenue kept by the house (GGR)", es: "Ingreso retenido por la banca (GGR)" }, v: mk.ggr_2025_total_bi || 37, c: C.amber },
    { l: { pt: "Arrecadação pública", en: "Public tax revenue", es: "Recaudación pública" }, v: mk.arrecadacao_2025_bi || 8.8, c: C.blue }
  ];
  var maxV = rows[0].v, x0 = 24, wMax = 480, y = 34, gap = 84;
  rows.forEach(function (r, i) {
    var w = wMax * r.v / maxV, cy = y + i * gap;
    var cx = x0 + (wMax - w) / 2;
    f.s.appendChild(rect(cx, cy, w, 46, r.c, { rx: 6, opacity: .9 }));
    f.s.appendChild(txt(x0 + wMax / 2, cy + 28, "R$ " + (r.v < 100 ? dec(r.v, 1, LANG) : grp(r.v, LANG)) + " " + biName(LANG), "glabel",
      { "text-anchor": "middle", "font-size": 15, fill: "#12131a", "font-weight": "700" }));
    f.s.appendChild(txt(x0 + wMax / 2, cy - 6, r.l[LANG], "g-note", { "text-anchor": "middle", "font-size": 11.5, fill: C.ink2 }));
    if (i < rows.length - 1) {
      var pct = Math.round(rows[i + 1].v / r.v * 100);
      f.s.appendChild(txt(x0 + wMax + 20, cy + 46 + gap / 2 - 6, "▼ " + pct + "%", "g-note", { fill: C.mut, "font-size": 11 }));
    }
  });
  f.s.appendChild(txt(x0, 300 - 8, { pt: "Cada barra é uma fração do dinheiro em movimento. Quase tudo fica no setor.", en: "Each bar is a fraction of the money in motion. Almost all of it stays in the sector.", es: "Cada barra es una fracción del dinero en movimiento. Casi todo se queda en el sector." }[LANG], "g-note", { fill: C.mut }));
}

/* linha temporal genérica */
function timeSeries(id, series, opts) {
  opts = opts || {};
  var W = 720, H = opts.h || 300, ml = 44, mr = 16, mt = 22, mb = 44;
  var f = frame(id, W, H); if (!f) return;
  var iw = W - ml - mr, ih = H - mt - mb;
  var allx = series[0].pts.map(function (p) { return p.x; });
  var n = allx.length;
  var maxY = 0; series.forEach(function (s) { s.pts.forEach(function (p) { if (p.y > maxY) maxY = p.y; }); });
  maxY = opts.maxY || (Math.ceil(maxY / 10) * 10) || 100;
  var X = function (i) { return ml + iw * i / (n - 1); };
  var Y = function (v) { return mt + ih - ih * v / maxY; };
  for (var g = 0; g <= 4; g++) {
    var v = maxY * g / 4, yy = Y(v);
    f.s.appendChild(line(ml, yy, W - mr, yy, C.line, .6));
    f.s.appendChild(txt(ml - 6, yy + 3, opts.fmtY ? opts.fmtY(v) : grp(v, LANG), "axis", { "text-anchor": "end" }));
  }
  var seen = {};
  allx.forEach(function (lbl, i) {
    var yr = String(lbl).slice(0, 4);
    if (!seen[yr] && (i === 0 || yr !== String(allx[i - 1]).slice(0, 4))) {
      seen[yr] = 1;
      f.s.appendChild(txt(X(i), H - mb + 16, yr, "axis", { "text-anchor": "middle" }));
    }
  });
  (opts.events || []).forEach(function (ev) {
    var idx = allx.indexOf(ev.x);
    if (idx < 0) { idx = 0; var best = 1e9; allx.forEach(function (l, i) { var d = Math.abs(new Date(l + "-01") - new Date(ev.x + "-01")); if (d < best) { best = d; idx = i; } }); }
    var xx = X(idx);
    f.s.appendChild(line(xx, mt, xx, mt + ih, C.mut, .8, "3 3"));
    f.s.appendChild(txt(xx, mt - 7, ev.label, "g-note", { "text-anchor": "middle", "font-size": 9.5, fill: C.mut }));
  });
  series.forEach(function (s) {
    var d = s.pts.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.y).toFixed(1); }).join("");
    f.s.appendChild(pathEl(d, { fill: "none", stroke: s.color, "stroke-width": s.w || 2, opacity: s.op || 1 }));
    if (s.name) f.s.appendChild(txt(X(n - 1) - 2, Y(s.pts[n - 1].y) - 5, s.name, "glabel", { "text-anchor": "end", fill: s.color, "font-size": 11 }));
  });
}

function chartTraj() {
  var ot = (D.trends && D.trends.over_time) || {};
  if (!ot.bet && !ot.tigrinho) { var e = document.getElementById("c-traj"); if (e) e.innerHTML = '<p class="figcap">Google Trends indisponível.</p>'; return; }
  function toPts(term) { var o = ot[term] || {}; return Object.keys(o).sort().map(function (d) { return { x: d.slice(0, 7), y: o[d] }; }); }
  var series = [];
  if (ot.bet) series.push({ pts: toPts("bet"), color: C.red, w: 2.2, name: "bet" });
  if (ot.tigrinho) series.push({ pts: toPts("tigrinho"), color: C.amber, w: 1.6, op: .85, name: "tigrinho" });
  var evLabel = { "2023-12": { pt: "Regulação", en: "Regulation", es: "Regulación" }, "2025-01": { pt: "Mercado regulado", en: "Regulated mkt", es: "Mercado regulado" }, "2026-06": { pt: "Copa", en: "World Cup", es: "Mundial" } };
  var events = Object.keys(evLabel).map(function (k) { return { x: k, label: evLabel[k][LANG] }; });
  timeSeries("c-traj", series, { h: 320, maxY: 100, events: events });
}

function chartSTL() {
  var stl = D.stl; if (!stl || !stl.dates) { var e = document.getElementById("c-stl"); if (e) e.innerHTML = ""; return; }
  var series = [
    { pts: stl.dates.map(function (d, i) { return { x: d, y: stl.observed[i] }; }), color: C.mut, w: 1, op: .6, name: { pt: "observado", en: "observed", es: "observado" }[LANG] },
    { pts: stl.dates.map(function (d, i) { return { x: d, y: stl.trend[i] }; }), color: C.blue, w: 2.4, name: { pt: "tendência", en: "trend", es: "tendencia" }[LANG] }
  ];
  timeSeries("c-stl", series, { h: 260, maxY: 100 });
}

function chartIncome() {
  var f = frame("c-income", 720, 300); if (!f) return;
  var g = (M && M.lenad && M.lenad.income_gradient) || [];
  var ml = 156, mr = 60, mt = 30, mb = 30, iw = 720 - ml - mr, ih = 300 - mt - mb;
  var maxV = 70, bh = ih / g.length * .58, gap = ih / g.length;
  for (var gg = 0; gg <= 7; gg++) { var v = gg * 10, x = ml + iw * v / maxV; f.s.appendChild(line(x, mt, x, mt + ih, C.line, .5)); f.s.appendChild(txt(x, mt + ih + 16, v + "%", "axis", { "text-anchor": "middle" })); }
  g.forEach(function (r, i) {
    var y = mt + i * gap + (gap - bh) / 2, w = iw * r.pct / maxV, t = i / (g.length - 1);
    f.s.appendChild(rect(ml, y, w, bh, seqRed(1 - t * .68), { rx: 4 }));
    var xlo = ml + iw * r.lo / maxV, xhi = ml + iw * r.hi / maxV, cy = y + bh / 2;
    f.s.appendChild(line(xlo, cy, xhi, cy, C.ink, 1.2));
    f.s.appendChild(line(xlo, cy - 4, xlo, cy + 4, C.ink, 1.2)); f.s.appendChild(line(xhi, cy - 4, xhi, cy + 4, C.ink, 1.2));
    f.s.appendChild(txt(ml + w + 10, cy + 4, dec(r.pct, 1, LANG) + "%", "glabel", { fill: C.ink, "font-weight": "600" }));
    f.s.appendChild(txt(ml - 10, cy + 4, r["band_" + LANG], "glabel", { "text-anchor": "end", fill: C.ink2, "font-size": 12 }));
  });
  f.s.appendChild(txt(ml, 18, { pt: "% de apostadores em uso de risco/problemático, por faixa de renda (IC 95%)", en: "% of bettors in risky/problematic use, by income band (95% CI)", es: "% de apostadores en uso de riesgo/problemático, por tramo de renta (IC 95%)" }[LANG], "g-note", { fill: C.mut }));
}

function chartMC() {
  var mc = D.monte_carlo; if (!mc) return;
  var f = frame("c-mc", 720, 360); if (!f) return;
  var ml = 54, mr = 54, mt = 22, mb = 40, iw = 720 - ml - mr, ih = 360 - mt - mb;
  var steps = mc.steps, n = steps.length, p = mc.percentiles;
  var maxB = 0; p["95"].forEach(function (v) { if (v > maxB) maxB = v; }); maxB = Math.ceil(maxB / 100) * 100 || 800;
  var X = function (i) { return ml + iw * i / (n - 1); };
  var Y = function (v) { return mt + ih - ih * v / maxB; };
  var Yr = function (v) { return mt + ih - ih * v / 100; };
  for (var gi = 0; gi <= 4; gi++) { var v = maxB * gi / 4, yy = Y(v); f.s.appendChild(line(ml, yy, 720 - mr, yy, C.line, .5)); f.s.appendChild(txt(ml - 6, yy + 3, "R$" + grp(v, LANG), "axis", { "text-anchor": "end" })); f.s.appendChild(txt(720 - mr + 6, Yr(gi * 25) + 3, (gi * 25) + "%", "axis", { fill: C.red, "text-anchor": "start" })); }
  steps.forEach(function (s, i) { if (s % 50 === 0) f.s.appendChild(txt(X(i), 360 - mb + 16, s, "axis", { "text-anchor": "middle" })); });
  function band(a, b, fill, op) {
    var d = "M" + X(0) + " " + Y(p[a][0]);
    for (var i = 1; i < n; i++) d += "L" + X(i) + " " + Y(p[a][i]);
    for (var j = n - 1; j >= 0; j--) d += "L" + X(j) + " " + Y(p[b][j]);
    f.s.appendChild(pathEl(d + "Z", { fill: fill, opacity: op, stroke: "none" }));
  }
  band("5", "95", C.blue, .12); band("25", "75", C.blue, .22);
  f.s.appendChild(pathEl(p["50"].map(function (v, i) { return (i ? "L" : "M") + X(i) + " " + Y(v); }).join(""), { fill: "none", stroke: C.ink, "stroke-width": 2.4 }));
  f.s.appendChild(pathEl(mc.ruin_pct.map(function (v, i) { return (i ? "L" : "M") + X(i) + " " + Yr(v); }).join(""), { fill: "none", stroke: C.red, "stroke-width": 2.2, "stroke-dasharray": "5 3" }));
  f.s.appendChild(txt(ml + 6, mt + 12, { pt: "Banca (R$)", en: "Bankroll (R$)", es: "Saldo (R$)" }[LANG], "glabel", { fill: C.ink2 }));
  f.s.appendChild(txt(720 - mr - 4, mt + 12, { pt: "Ruína (%)", en: "Ruin (%)", es: "Ruina (%)" }[LANG], "glabel", { "text-anchor": "end", fill: C.red }));
  f.s.appendChild(txt(X(n - 1) - 4, Y(p["50"][n - 1]) - 8, { pt: "mediana", en: "median", es: "mediana" }[LANG], "glabel", { "text-anchor": "end", fill: C.ink2, "font-size": 11 }));
}

function chartSplit() {
  var f = frame("c-split", 720, 210); if (!f) return;
  var ml = 24, mr = 24, mt = 44, iw = 720 - ml - mr, u = iw / 291;
  f.s.appendChild(rect(ml, mt, iw - u, 54, mix("#2a2f42", C.mut, .28), { rx: 5 }));
  f.s.appendChild(rect(ml + iw - u * 1.6, mt, u * 1.6, 54, C.red, { rx: 2 }));
  f.s.appendChild(txt(ml + (iw - u) / 2, mt + 32, { pt: "R$ 290 retidos pelo setor", en: "R$290 kept by the sector", es: "R$ 290 retenidos por el sector" }[LANG], "glabel", { "text-anchor": "middle", fill: C.ink, "font-weight": "600", "font-size": 14 }));
  f.s.appendChild(line(ml + iw - u * 0.8, mt + 54, ml + iw - u * 0.8, mt + 82, C.red, 1));
  f.s.appendChild(txt(ml + iw - u * 0.8, mt + 98, { pt: "R$ 1 vira salário", en: "R$1 becomes wage", es: "R$ 1 se vuelve salario" }[LANG], "glabel", { "text-anchor": "middle", fill: C.red, "font-size": 12, "font-weight": "600" }));
  f.s.appendChild(txt(ml, mt - 14, { pt: "Para cada R$ 291 de receita do setor de apostas", en: "For every R$291 of betting-sector revenue", es: "Por cada R$ 291 de ingreso del sector de apuestas" }[LANG], "g-note", { fill: C.mut }));
}

function chartSuic() {
  var sim = D.sim; if (!sim || !sim.years) return;
  var pts = sim.years.map(function (y) { var tot = 0; Object.keys(sim.by_uf_year).forEach(function (u) { tot += sim.by_uf_year[u][y] || 0; }); return { x: y, y: tot }; });
  timeSeries("c-suic", [{ pts: pts, color: C.red, w: 2.6, name: "X60–X84" }], { h: 300, maxY: 20000, fmtY: function (v) { return grp(v, LANG); } });
}

function chartCost() {
  var f = frame("c-cost", 720, 200); if (!f) return;
  var ie = (M && M.ieps) || {};
  var comps = [
    { l: { pt: "Suicídio", en: "Suicide", es: "Suicidio" }, v: ie.custo_suicidio_bi || 17, c: C.red },
    { l: { pt: "Depressão", en: "Depression", es: "Depresión" }, v: ie.custo_depressao_bi || 13.4, c: seqRed(.7) },
    { l: { pt: "Encarceramento", en: "Incarceration", es: "Encarcelamiento" }, v: ie.custo_encarceramento_bi || 4.7, c: C.mut },
    { l: { pt: "Seguro-desemprego", en: "Unemployment ins.", es: "Seguro desempleo" }, v: ie.custo_seguro_desemprego_bi || 2.1, c: mix("#2a2f42", C.mut, .5) },
    { l: { pt: "Moradia", en: "Housing", es: "Vivienda" }, v: ie.custo_moradia_bi || 1.3, c: mix("#2a2f42", C.mut, .35) }
  ];
  var total = comps.reduce(function (a, c) { return a + c.v; }, 0);
  var ml = 24, mr = 24, mt = 56, iw = 720 - ml - mr, x = ml;
  comps.forEach(function (c, idx) {
    var w = iw * c.v / total;
    f.s.appendChild(rect(x, mt, w - 2, 50, c.c, { rx: 3 }));
    if (w > 44) f.s.appendChild(txt(x + w / 2, mt + 30, "R$ " + dec(c.v, 1, LANG), "glabel", { "text-anchor": "middle", fill: "#12131a", "font-weight": "700", "font-size": 12 }));
    var ly = mt + 68 + (idx >= 3 ? (idx - 2) * 15 : 0);
    if (idx >= 3) f.s.appendChild(line(x + w / 2, mt + 52, x + w / 2, ly - 10, C.line, .8));
    f.s.appendChild(txt(x + w / 2, ly, c.l[LANG], "g-note", { "text-anchor": "middle", fill: C.ink2, "font-size": 10.5 }));
    x += w;
  });
  f.s.appendChild(txt(ml, mt - 18, { pt: "Custo social total: R$ 38,8 bi/ano. Quase 79% ligado à saúde.", en: "Total social cost: R$38.8bn/yr. Nearly 79% health-related.", es: "Costo social total: R$ 38,8 mm/año. Casi 79% ligado a la salud." }[LANG], "g-note", { fill: C.mut }));
}

var MAP_LAYER = "search";
function chartMap() {
  var geo = D.geometry; if (!geo || !geo.paths) { var mm = document.getElementById("map"); if (mm) mm.textContent = "mapa indisponível"; return; }
  var met = ufMetrics().m, t = T().sec.geografia.layers;
  var ctrl = document.getElementById("map-ctrl");
  ctrl.innerHTML = ["search", "suicide", "caps", "income"].map(function (k) {
    return '<button data-layer="' + k + '"' + (k === MAP_LAYER ? ' class="on"' : "") + ">" + t[k] + "</button>";
  }).join("");
  ctrl.querySelectorAll("button").forEach(function (b) { b.onclick = function () { MAP_LAYER = b.getAttribute("data-layer"); chartMap(); }; });
  var vals = Object.keys(UF).map(function (u) { return met[u][MAP_LAYER]; }).filter(function (v) { return v != null; });
  var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
  var scale = (MAP_LAYER === "income") ? seqBlue : seqRed;
  var c = document.getElementById("map"); c.innerHTML = "";
  var s = el("svg", { viewBox: geo.viewBox, preserveAspectRatio: "xMidYMid meet" });
  s.style.maxHeight = "560px";
  Object.keys(geo.paths).forEach(function (u) {
    var v = met[u][MAP_LAYER], t01 = (v == null || mx === mn) ? 0 : (v - mn) / (mx - mn);
    var p = pathEl(geo.paths[u], { fill: v == null ? C.line : scale(.12 + t01 * .88), "data-uf": u });
    p.addEventListener("mousemove", function (ev) {
      var m = met[u], L = T().sec.geografia.layers;
      tip("<b>" + u + "</b> " + UF[u] + "<br>" + L.search + ": " + (m.search != null ? m.search : "—") +
        "<br>" + L.suicide + ": " + (m.suicide != null ? m.suicide : "—") +
        "<br>" + L.caps + ": " + (m.caps != null ? m.caps : "—") +
        "<br>" + L.income + ": " + (m.income != null ? "R$ " + grp(m.income, LANG) : "—"), ev);
    });
    p.addEventListener("mouseleave", untip);
    s.appendChild(p);
  });
  c.appendChild(s);
  var lg = document.getElementById("map-legend"), g0 = scale(.12), g1 = scale(1);
  lg.innerHTML = '<span>' + (MAP_LAYER === "income" ? grp(mn, LANG) : dec(mn, 0, LANG)) + '</span>' +
    '<span class="bar" style="background:linear-gradient(90deg,' + g0 + ',' + g1 + ')"></span>' +
    '<span>' + (MAP_LAYER === "income" ? "R$ " + grp(mx, LANG) : dec(mx, 0, LANG)) + '</span>' +
    '<span style="margin-left:10px">· ' + t[MAP_LAYER] + '</span>';
}

function chartCorr() {
  var co = D.correlations; if (!co || !co.pairs) { var e = document.getElementById("c-corr"); if (e) e.innerHTML = ""; return; }
  var f = frame("c-corr", 720, 230); if (!f) return;
  var labels = {
    busca_vs_renda: { pt: "Busca × Renda", en: "Search × Income", es: "Búsqueda × Renta" },
    busca_vs_suicidio: { pt: "Busca × Suicídio", en: "Search × Suicide", es: "Búsqueda × Suicidio" },
    renda_vs_suicidio: { pt: "Renda × Suicídio", en: "Income × Suicide", es: "Renta × Suicidio" }
  };
  var keys = Object.keys(labels).filter(function (k) { return co.pairs[k]; });
  var ml = 150, mr = 30, mt = 28, mb = 30, iw = 720 - ml - mr, ih = 230 - mt - mb;
  var cx = ml + iw / 2, gap = ih / keys.length, bh = 16;
  [-1, -0.5, 0, 0.5, 1].forEach(function (tk) {
    var x = cx + iw / 2 * tk; f.s.appendChild(line(x, mt, x, mt + ih, C.line, tk === 0 ? 1 : .5));
    f.s.appendChild(txt(x, mt + ih + 16, dec(tk, 1, LANG), "axis", { "text-anchor": "middle" }));
  });
  keys.forEach(function (k, i) {
    var pr = co.pairs[k], y = mt + i * gap + gap / 2;
    var xr = cx + iw / 2 * pr.rho, xlo = cx + iw / 2 * pr.ci95[0], xhi = cx + iw / 2 * pr.ci95[1];
    var col = pr.rho < 0 ? C.blue : C.red;
    f.s.appendChild(rect(Math.min(cx, xr), y - bh / 2, Math.abs(xr - cx), bh, col, { rx: 2, opacity: .85 }));
    f.s.appendChild(line(xlo, y, xhi, y, C.ink2, 1.2));
    f.s.appendChild(line(xlo, y - 4, xlo, y + 4, C.ink2, 1.2)); f.s.appendChild(line(xhi, y - 4, xhi, y + 4, C.ink2, 1.2));
    f.s.appendChild(txt(ml - 10, y + 4, labels[k][LANG], "glabel", { "text-anchor": "end", fill: C.ink2, "font-size": 12 }));
    f.s.appendChild(txt(xr + (pr.rho < 0 ? -6 : 6), y - 8, dec(pr.rho, 2, LANG), "glabel", { "text-anchor": pr.rho < 0 ? "end" : "start", fill: col, "font-weight": "600", "font-size": 11 }));
  });
  f.s.appendChild(txt(ml, 18, { pt: "Coeficiente de Spearman (n=27) com IC 95% bootstrap. Negativo = azul.", en: "Spearman coefficient (n=27) with 95% bootstrap CI. Negative = blue.", es: "Coeficiente de Spearman (n=27) con IC 95% bootstrap. Negativo = azul." }[LANG], "g-note", { fill: C.mut }));
}

function chartInclExcl() {
  var f = frame("c-inclexcl", 720, 150); if (!f) return;
  var ml = 24, mr = 24, mt = 52, iw = 720 - ml - mr, wC = iw * .60;
  var defs = el("defs"); var pat = el("pattern", { id: "hatch", width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
  pat.appendChild(rect(0, 0, 7, 7, C.paper2)); pat.appendChild(line(0, 0, 0, 7, C.mut, 1.4)); defs.appendChild(pat); f.s.appendChild(defs);
  f.s.appendChild(rect(ml, mt, wC, 46, C.red, { rx: 5, opacity: .85 }));
  f.s.appendChild(txt(ml + wC / 2, mt + 28, "R$ 38,8 " + biName(LANG), "glabel", { "text-anchor": "middle", fill: "#12131a", "font-weight": "700", "font-size": 15 }));
  var xo = ml + wC + 6, wo = iw - wC - 30;
  f.s.appendChild(rect(xo, mt, wo, 46, "url(#hatch)", { rx: 5 }));
  f.s.appendChild(rect(xo, mt, wo, 46, "none", { rx: 5, stroke: C.mut, "stroke-dasharray": "4 3", "stroke-width": 1 }));
  f.s.appendChild(txt(xo + wo / 2, mt + 29, "+ ?", "glabel", { "text-anchor": "middle", fill: C.ink2, "font-weight": "700" }));
  f.s.appendChild(txt(ml, mt - 16, { pt: "Contabilizado (piso)", en: "Counted (floor)", es: "Contabilizado (piso)" }[LANG], "g-note", { fill: C.mut }));
  f.s.appendChild(txt(xo, mt - 16, { pt: "Reconhecido, não precificado", en: "Recognized, not priced", es: "Reconocido, no valorizado" }[LANG], "g-note", { fill: C.mut }));
  f.s.appendChild(txt(ml, 138, { pt: "A cifra é um piso: exclui o dinheiro perdido pelas famílias, violência e produtividade.", en: "The figure is a floor: it excludes families' losses, violence and productivity.", es: "La cifra es un piso: excluye el dinero perdido por las familias, violencia y productividad." }[LANG], "g-note", { fill: C.mut }));
}

function renderRefs() {
  var box = document.getElementById("refs"); if (!box) return;
  var items = (D.references && D.references.items) || [];
  box.innerHTML = items.map(function (r, i) {
    return '<li id="ref' + (i + 1) + '"><b>' + r.authors + '</b> (' + r.year + '). ' + r.title + '. <i>' + r.venue + '</i>. · <a href="https://doi.org/' + r.doi + '" target="_blank" rel="noopener">doi:' + r.doi + '</a></li>';
  }).join("");
}

var SORT = { key: "search", asc: false };
function renderTable() {
  var box = document.getElementById("apx"); if (!box) return;
  var met = ufMetrics().m, cols = T().sec.apendice.cols;
  var rows = Object.keys(UF).map(function (u) { return Object.assign({ uf: u, name: UF[u] }, met[u]); });
  rows.sort(function (a, b) {
    var k = SORT.key, va = a[k], vb = b[k];
    if (typeof va === "string") return SORT.asc ? va.localeCompare(vb) : vb.localeCompare(va);
    va = va == null ? -Infinity : va; vb = vb == null ? -Infinity : vb;
    return SORT.asc ? va - vb : vb - va;
  });
  var order = [["uf", cols.uf], ["name", cols.name], ["search", cols.search], ["suicide", cols.suicide], ["caps", cols.caps], ["income", cols.income]];
  var th = order.map(function (o) {
    var cls = o[0] === SORT.key ? " class='sorted" + (SORT.asc ? " asc" : "") + "'" : "";
    return "<th data-k='" + o[0] + "'" + cls + ">" + o[1] + "</th>";
  }).join("");
  var body = rows.map(function (r) {
    return "<tr><td class='mono'>" + r.uf + "</td><td>" + r.name + "</td>" +
      "<td class='num'>" + (r.search != null ? dec(r.search, 1, LANG) : "—") + "</td>" +
      "<td class='num'>" + (r.suicide != null ? dec(r.suicide, 1, LANG) : "—") + "</td>" +
      "<td class='num'>" + (r.caps != null ? dec(r.caps, 1, LANG) : "—") + "</td>" +
      "<td class='num'>" + (r.income != null ? grp(r.income, LANG) : "—") + "</td></tr>";
  }).join("");
  box.innerHTML = "<table class='tbl'><thead><tr>" + th + "</tr></thead><tbody>" + body + "</tbody></table>";
  box.querySelectorAll("th").forEach(function (h) {
    h.onclick = function () { var k = h.getAttribute("data-k"); if (SORT.key === k) SORT.asc = !SORT.asc; else { SORT.key = k; SORT.asc = (k === "uf" || k === "name"); } renderTable(); };
  });
}

function renderCharts() {
  chartFunnel(); chartTraj(); chartSTL(); chartIncome(); chartMC();
  chartSplit(); chartSuic(); chartCost(); chartMap(); chartCorr();
  chartInclExcl(); renderRefs(); renderTable();
}

/* =========================================================
   IDIOMA + INIT
   ========================================================= */
function setLang(l) {
  LANG = l;
  document.querySelectorAll(".langs button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-setlang") === l); });
  document.getElementById("nav-brand").textContent = T().foot.title;
  applyStatic(); buildSections(); renderCharts();
}

function init() {
  document.querySelectorAll(".langs button").forEach(function (b) { b.onclick = function () { setLang(b.getAttribute("data-setlang")); }; });
  window.addEventListener("scroll", function () {
    var h = document.documentElement, sc = h.scrollTop / (h.scrollHeight - h.clientHeight);
    document.getElementById("prog").style.width = (sc * 100) + "%";
  }, { passive: true });
  setLang("pt");
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
