import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Paper,
} from "@mui/material";
import {
  AutoAwesome,
  Speed,
  Groups,
  Refresh,
  Visibility,
  Psychology,
  TrendingUp,
  MenuBook,
  Download,
  CheckCircle,
  Timeline,
} from "@mui/icons-material";
import Navbar from "@/components/Navbar";

const fibonacciSequence = [1, 2, 3, 5, 8, 13, 21];

const scrumValues = [
  {
    icon: <Psychology sx={{ fontSize: 40 }} />,
    title: "Foco",
    description: "Todos focam no trabalho do Sprint e nas metas da equipe",
    color: "#6366f1",
  },
  {
    icon: <Visibility sx={{ fontSize: 40 }} />,
    title: "Abertura",
    description: "A equipe é aberta sobre o trabalho e os desafios",
    color: "#8b5cf6",
  },
  {
    icon: <Groups sx={{ fontSize: 40 }} />,
    title: "Respeito",
    description: "Membros respeitam uns aos outros como pessoas capazes",
    color: "#06b6d4",
  },
  {
    icon: <AutoAwesome sx={{ fontSize: 40 }} />,
    title: "Coragem",
    description:
      "Têm coragem para fazer a coisa certa e trabalhar em problemas difíceis",
    color: "#10b981",
  },
  {
    icon: <CheckCircle sx={{ fontSize: 40 }} />,
    title: "Comprometimento",
    description:
      "Comprometidos em alcançar os objetivos e apoiar uns aos outros",
    color: "#f59e0b",
  },
];

const scrumBenefits = [
  "Entregas mais rápidas de soluções em saúde",
  "Adaptação rápida a novos desafios clínicos",
  "Melhor qualidade e segurança do produto",
  "Maior impacto na vida dos pacientes",
  "Equipes médicas e tech alinhadas",
  "Transparência em cada etapa do cuidado",
];

export default function ScrumGuide() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          color: "white",
          py: 8,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            background: `
              radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)
            `,
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Refresh
              sx={{
                fontSize: 80,
                mb: 2,
                animation: "spin 20s linear infinite",
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" },
                },
              }}
            />
            <Typography
              variant="h2"
              fontWeight={800}
              gutterBottom
              sx={{ letterSpacing: "-0.02em" }}
            >
              SCRUM na Saúde
            </Typography>
            <Typography
              variant="h5"
              sx={{
                opacity: 0.95,
                fontWeight: 400,
                maxWidth: 800,
                mx: "auto",
                mb: 2,
              }}
            >
              Transformando a inovação em saúde através de metodologia ágil
            </Typography>
            <Box
              sx={{
                display: "inline-block",
                px: 4,
                py: 1.5,
                borderRadius: 3,
                bgcolor: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                border: "2px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ fontStyle: "italic" }}
              >
                "Inovar é cuidar do futuro"
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Missão Daher Lab
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Healthcare Mission */}
        <Box sx={{ mb: 8 }}>
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 4,
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)",
              border: "2px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  background:
                    "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 16px rgba(16, 185, 129, 0.3)",
                }}
              >
                <TrendingUp sx={{ color: "white", fontSize: 32 }} />
              </Box>
              <Typography
                variant="h3"
                fontWeight={800}
                sx={{ color: "#10b981" }}
              >
                Eficiência: Um Objetivo Social
              </Typography>
            </Box>

            <Typography
              variant="h6"
              sx={{ mb: 3, lineHeight: 1.8, fontWeight: 500 }}
            >
              Na saúde, <strong>eficiência não é apenas produtividade</strong> —
              é uma questão de <strong>sustentabilidade do sistema</strong> e
              cuidado com as gerações futuras.
            </Typography>

            <Typography
              variant="body1"
              sx={{ mb: 3, lineHeight: 1.8, fontSize: "1.05rem" }}
            >
              Cada minuto economizado, cada processo otimizado, cada inovação
              implementada de forma ágil significa:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                "Mais pacientes atendidos com qualidade",
                "Menos desperdício de recursos públicos e privados",
                "Profissionais de saúde focados no que realmente importa",
                "Tecnologias chegando mais rápido a quem precisa",
                "Sistema de saúde preparado para os desafios futuros",
              ].map((item, index) => (
                <Grid item xs={12} key={index}>
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                    <CheckCircle
                      sx={{ color: "#10b981", fontSize: 24, flexShrink: 0 }}
                    />
                    <Typography
                      variant="body1"
                      sx={{ lineHeight: 1.8, fontWeight: 500 }}
                    >
                      {item}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: "white",
                border: "2px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ mb: 1, color: "#10b981" }}
              >
                O Papel do SCRUM
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                O SCRUM nos permite{" "}
                <strong>inovar com velocidade e qualidade</strong>, testando
                soluções rapidamente, aprendendo com erros sem grandes
                prejuízos, e entregando valor incremental. Em healthtech, isso
                significa <strong>salvar vidas mais cedo</strong>, melhorar
                desfechos clínicos continuamente, e construir um futuro
                sustentável para a saúde.
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* What is SCRUM */}
        <Box sx={{ mb: 8 }}>
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 4,
              background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
              border: "2px solid rgba(99, 102, 241, 0.1)",
            }}
          >
            <Typography
              variant="h3"
              fontWeight={800}
              gutterBottom
              sx={{ color: "#6366f1", mb: 3 }}
            >
              O que é SCRUM?
            </Typography>
            <Typography
              variant="h6"
              sx={{ mb: 3, lineHeight: 1.8, fontWeight: 400 }}
            >
              SCRUM é um <strong>framework leve</strong> que ajuda pessoas,
              equipes e organizações a <strong>gerar valor</strong> por meio de
              soluções adaptativas para problemas complexos.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                lineHeight: 1.8,
                color: "text.secondary",
                fontSize: "1.05rem",
              }}
            >
              Em essência, SCRUM requer um <strong>Scrum Master</strong> para
              promover um ambiente onde:
            </Typography>
            <Box sx={{ mt: 3, pl: 3 }}>
              {[
                "Um Product Owner ordena o trabalho para um problema complexo em um Product Backlog",
                "O Scrum Team transforma uma seleção do trabalho em um Incremento de valor durante um Sprint",
                "O Scrum Team e seus stakeholders inspecionam os resultados e se ajustam para o próximo Sprint",
                "O processo se repete continuamente",
              ].map((item, index) => (
                <Box key={index} sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <CheckCircle
                    sx={{
                      color: "#10b981",
                      fontSize: 24,
                      flexShrink: 0,
                      mt: 0.5,
                    }}
                  />
                  <Typography
                    variant="body1"
                    sx={{ lineHeight: 1.8, fontSize: "1.05rem" }}
                  >
                    {item}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* SCRUM Values */}
        <Box sx={{ mb: 8 }}>
          <Box sx={{ textAlign: "center", mb: 5 }}>
            <Typography
              variant="h3"
              fontWeight={800}
              gutterBottom
              sx={{ color: "#6366f1" }}
            >
              Os 5 Valores do SCRUM
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 700, mx: "auto" }}
            >
              Pilares fundamentais que guiam o comportamento e as decisões da
              equipe
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {scrumValues.map((value, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  elevation={0}
                  sx={{
                    height: "100%",
                    background:
                      "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                    border: "2px solid rgba(99, 102, 241, 0.1)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                      border: `2px solid ${value.color}40`,
                    },
                  }}
                >
                  <CardContent sx={{ p: 3, textAlign: "center" }}>
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${value.color} 0%, ${value.color}dd 100%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        margin: "0 auto 16px",
                        boxShadow: `0 8px 16px ${value.color}40`,
                      }}
                    >
                      {value.icon}
                    </Box>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                      {value.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.6 }}
                    >
                      {value.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Why SCRUM is Good */}
        <Box sx={{ mb: 8 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h3"
                fontWeight={800}
                gutterBottom
                sx={{ color: "#6366f1" }}
              >
                Por que SCRUM funciona na Saúde?
              </Typography>
              <Typography
                variant="body1"
                sx={{ mb: 3, lineHeight: 1.8, fontSize: "1.1rem" }}
              >
                SCRUM é construído sobre a{" "}
                <strong>teoria empírica de controle de processos</strong>, ou
                empirismo. Em healthtech, isso significa:{" "}
                <strong>testar soluções reais</strong> com usuários reais
                (médicos, enfermeiros, pacientes) e{" "}
                <strong>aprender rapidamente</strong> o que funciona —
                economizando tempo e recursos preciosos do sistema de saúde.
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                {scrumBenefits.map((benefit, index) => (
                  <Chip
                    key={index}
                    label={benefit}
                    sx={{
                      py: 2.5,
                      px: 1,
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      background:
                        "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      color: "white",
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                      },
                    }}
                    icon={<CheckCircle sx={{ color: "white !important" }} />}
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: 4,
                  background:
                    "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
                  border: "2px solid rgba(99, 102, 241, 0.2)",
                }}
              >
                <Timeline sx={{ fontSize: 60, color: "#6366f1", mb: 2 }} />
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Ciclo Iterativo = Sustentabilidade
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.8, mb: 2 }}>
                  Cada Sprint é uma oportunidade de{" "}
                  <strong>melhorar processos clínicos</strong>,{" "}
                  <strong>otimizar fluxos</strong> e{" "}
                  <strong>reduzir desperdícios</strong> — tudo sem interromper o
                  atendimento.
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                  Na saúde, isso significa{" "}
                  <strong>evolução contínua sem riscos</strong>. Pequenas
                  melhorias constantes que, somadas,{" "}
                  <strong>transformam o sistema</strong> e garantem sua
                  sustentabilidade a longo prazo.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Velocity & Fibonacci */}
        <Box sx={{ mb: 8 }}>
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 4,
              background:
                "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)",
              border: "2px solid rgba(99, 102, 241, 0.2)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Speed sx={{ fontSize: 48, color: "#6366f1" }} />
              <Typography
                variant="h3"
                fontWeight={800}
                sx={{ color: "#6366f1" }}
              >
                Velocity e Fibonacci
              </Typography>
            </Box>

            <Typography variant="h6" sx={{ mb: 3, lineHeight: 1.8 }}>
              <strong>Velocity</strong> é a quantidade de trabalho que uma
              equipe pode completar durante um Sprint, medida em{" "}
              <strong>Story Points</strong>. Na saúde, isso nos ajuda a{" "}
              <strong>
                prever quando novas funcionalidades chegarão aos profissionais
              </strong>{" "}
              e pacientes.
            </Typography>

            <Typography
              variant="body1"
              sx={{ mb: 3, lineHeight: 1.8, fontSize: "1.05rem" }}
            >
              A sequência de <strong>Fibonacci</strong> (1, 2, 3, 5, 8, 13,
              21...) é usada para estimar o esforço porque reflete a{" "}
              <strong>incerteza natural</strong> de desenvolver tecnologia
              médica complexa:
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: "white",
                    height: "100%",
                    border: "2px solid rgba(99, 102, 241, 0.1)",
                  }}
                >
                  <TrendingUp sx={{ fontSize: 36, color: "#6366f1", mb: 1 }} />
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Incerteza Crescente
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    Quanto maior a tarefa, maior a incerteza. Os números crescem
                    exponencialmente, refletindo essa realidade.
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: "white",
                    height: "100%",
                    border: "2px solid rgba(99, 102, 241, 0.1)",
                  }}
                >
                  <Psychology sx={{ fontSize: 36, color: "#8b5cf6", mb: 1 }} />
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Evita Falsa Precisão
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    Força a equipe a não perder tempo decidindo entre 7 ou 8
                    pontos. Se não couber em 5, provavelmente é 8.
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: "white",
                    height: "100%",
                    border: "2px solid rgba(99, 102, 241, 0.1)",
                  }}
                >
                  <AutoAwesome sx={{ fontSize: 36, color: "#06b6d4", mb: 1 }} />
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Estimativa Relativa
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    A equipe compara tarefas entre si, não estima tempo
                    absoluto. "Isso é 2x mais complexo que aquilo".
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "center",
                flexWrap: "wrap",
                p: 3,
                borderRadius: 3,
                bgcolor: "white",
              }}
            >
              {fibonacciSequence.map((num, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 800,
                    fontSize: "1.5rem",
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                    transition: "transform 0.3s",
                    "&:hover": {
                      transform: "scale(1.1) rotate(-5deg)",
                    },
                  }}
                >
                  {num}
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* Final Message */}
        <Box
          sx={{
            mb: 6,
            p: 5,
            borderRadius: 4,
            background:
              "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)",
            border: "2px solid rgba(16, 185, 129, 0.2)",
            textAlign: "center",
          }}
        >
          <Typography
            variant="h4"
            fontWeight={800}
            gutterBottom
            sx={{ color: "#10b981" }}
          >
            SCRUM: Uma Ferramenta para Transformar a Saúde
          </Typography>
          <Typography
            variant="h6"
            sx={{ lineHeight: 1.8, maxWidth: 900, mx: "auto", mb: 2 }}
          >
            Ao adotar SCRUM, não estamos apenas acelerando projetos — estamos{" "}
            <strong>
              construindo um sistema de saúde mais eficiente, sustentável e
              humano
            </strong>
            .
          </Typography>
          <Typography
            variant="body1"
            sx={{
              lineHeight: 1.8,
              maxWidth: 800,
              mx: "auto",
              fontSize: "1.05rem",
            }}
          >
            Cada sprint concluído é um passo em direção ao futuro que queremos:
            onde tecnologia e cuidado se encontram, onde inovação é acessível, e
            onde <strong>inovar é, verdadeiramente, cuidar do futuro</strong>.
          </Typography>
        </Box>

        {/* Official Guide */}
        <Box
          sx={{
            textAlign: "center",
            p: 6,
            borderRadius: 4,
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            color: "white",
          }}
        >
          <MenuBook sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h3" fontWeight={800} gutterBottom>
            Quer se aprofundar?
          </Typography>
          <Typography
            variant="h6"
            sx={{ mb: 4, opacity: 0.95, maxWidth: 700, mx: "auto" }}
          >
            Leia o Guia Oficial do SCRUM em português para entender todos os
            detalhes, papéis, eventos e artefatos do framework que está
            transformando a inovação em saúde.
          </Typography>
          <Button
            component="a"
            variant="contained"
            size="large"
            href="https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-PortugueseBR-3.0.pdf"
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<Download aria-hidden="true" />}
            aria-label="Baixar Guia Oficial do SCRUM em PDF - abre em nova aba"
            aria-describedby="scrum-guide-description"
            sx={{
              px: 6,
              py: 2,
              fontSize: "1.2rem",
              bgcolor: "white",
              color: "#fefefe",
              fontWeight: 700,
              minHeight: 56,
              border: "3px solid white",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
              "&:hover": {
                bgcolor: "#fbbf24",
                color: "#0f172a",
                transform: "translateY(-4px)",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
                border: "3px solid #fbbf24",
              },
              "&:focus-visible": {
                outline: "4px solid #fbbf24",
                outlineOffset: "4px",
                boxShadow:
                  "0 0 0 8px rgba(251, 191, 36, 0.4), 0 10px 30px rgba(0, 0, 0, 0.4)",
                bgcolor: "#fbbf24",
                color: "#0f172a",
              },
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            Baixar Guia Oficial do SCRUM (PDF)
          </Button>
          <Typography
            id="scrum-guide-description"
            variant="caption"
            sx={{
              display: "block",
              mt: 2,
              opacity: 0.9,
              color: "white",
              fontSize: "0.95rem",
            }}
          >
            Guia SCRUM 2020 - Versão em Português do Brasil - Arquivo PDF 1.2 MB
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
