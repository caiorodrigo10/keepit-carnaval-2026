import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, MapPin, Calendar, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="dark min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-center p-6">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-keepit-neon flex items-center justify-center">
            <span className="text-keepit-dark font-bold text-xl">K</span>
          </div>
          <span className="text-2xl font-bold text-foreground">Keepit</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-foreground mb-4">
            Carnaval 2026
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            Sambdromo do Anhembi - So Paulo
          </p>
          <p className="text-keepit-neon font-semibold text-lg">
            17 e 18 de Fevereiro
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-keepit-neon/10 flex items-center justify-center">
                <Camera className="h-6 w-6 text-keepit-neon" />
              </div>
              <CardTitle className="text-card-foreground">
                Mural de Fotos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Acesse todas as fotos do evento e apareca no telao!
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-keepit-neon/10 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-keepit-neon" />
              </div>
              <CardTitle className="text-card-foreground">
                Mapa Interativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Encontre palcos, banheiros, praca de alimentacao e a area Keepit.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-keepit-neon/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-keepit-neon" />
              </div>
              <CardTitle className="text-card-foreground">
                Programacao
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Confira os horarios dos desfiles e nao perca nenhum momento.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-keepit-neon/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-keepit-neon" />
              </div>
              <CardTitle className="text-card-foreground">Sorteios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Participe automaticamente dos sorteios exclusivos Keepit!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Button
            size="lg"
            className="bg-keepit-neon text-keepit-dark hover:bg-keepit-neon-light font-bold text-lg px-8 py-6 rounded-xl shadow-glow animate-pulse-glow"
          >
            Acessar Agora
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Cadastre-se para acessar todos os recursos
          </p>
        </div>

        {/* Status Badge */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
          <div className="bg-keepit-brand text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg">
            Sistema em desenvolvimento
          </div>
        </div>
      </main>
    </div>
  );
}
