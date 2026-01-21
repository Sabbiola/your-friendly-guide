import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Wallet, TrendingUp, Shield } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Accesso effettuato!');
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast.success('Account creato con successo!');
      }
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Errore durante l\'autenticazione');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-card to-background p-12 flex-col justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold gradient-text">
            SolanaBot
          </h1>
          <p className="text-muted-foreground mt-2">Copy Trading Dashboard</p>
        </div>

        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg">Copia i Migliori Wallet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Segui automaticamente i trader più profittevoli su Solana
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-success/10 text-success">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg">Monitora le Performance</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Dashboard real-time con PnL, statistiche e grafici dettagliati
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-accent/10 text-accent">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg">Risk Management</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Stop-loss, take-profit e filtri anti-rug automatici
              </p>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground text-sm">
          © 2024 SolanaBot. All rights reserved.
        </p>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <h1 className="font-display text-2xl font-bold gradient-text">
              SolanaBot
            </h1>
          </div>

          <div className="glass-card p-8">
            <h2 className="font-display text-2xl font-bold mb-2">
              {isLogin ? 'Bentornato!' : 'Crea Account'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isLogin
                ? 'Accedi per gestire il tuo copy trading'
                : 'Registrati per iniziare a copiare i migliori trader'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? 'Accesso...' : 'Registrazione...'}
                  </>
                ) : (
                  isLogin ? 'Accedi' : 'Registrati'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin
                  ? "Non hai un account? Registrati"
                  : 'Hai già un account? Accedi'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
