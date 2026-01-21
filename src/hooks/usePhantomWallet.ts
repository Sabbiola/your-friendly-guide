import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toString: () => string };
  isConnected?: boolean;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: (args: any) => void) => void;
  off: (event: string, callback: (args: any) => void) => void;
}

declare global {
  interface Window {
    phantom?: {
      solana?: PhantomProvider;
    };
    solana?: PhantomProvider;
  }
}

export function usePhantomWallet() {
  const [phantomInstalled, setPhantomInstalled] = useState(false);
  const [phantomAddress, setPhantomAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const getProvider = useCallback((): PhantomProvider | null => {
    if (typeof window === 'undefined') return null;
    
    const provider = window.phantom?.solana || window.solana;
    
    if (provider?.isPhantom) {
      return provider;
    }
    
    return null;
  }, []);

  // Check if Phantom is installed
  useEffect(() => {
    const checkPhantom = () => {
      const provider = getProvider();
      setPhantomInstalled(!!provider);
      
      // Check if already connected
      if (provider?.isConnected && provider?.publicKey) {
        setPhantomAddress(provider.publicKey.toString());
      }
    };

    // Wait for window to load
    if (document.readyState === 'complete') {
      checkPhantom();
    } else {
      window.addEventListener('load', checkPhantom);
      return () => window.removeEventListener('load', checkPhantom);
    }
  }, [getProvider]);

  // Listen for account changes
  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    const handleAccountChange = (publicKey: { toString: () => string } | null) => {
      if (publicKey) {
        setPhantomAddress(publicKey.toString());
      } else {
        setPhantomAddress(null);
      }
    };

    const handleDisconnect = () => {
      setPhantomAddress(null);
    };

    provider.on('accountChanged', handleAccountChange);
    provider.on('disconnect', handleDisconnect);

    return () => {
      provider.off('accountChanged', handleAccountChange);
      provider.off('disconnect', handleDisconnect);
    };
  }, [getProvider]);

  const connectPhantom = useCallback(async (): Promise<string | null> => {
    const provider = getProvider();
    
    if (!provider) {
      toast.error('Phantom non installato', {
        description: 'Installa l\'estensione Phantom dal Chrome Web Store',
        action: {
          label: 'Installa',
          onClick: () => window.open('https://phantom.app/', '_blank'),
        },
      });
      return null;
    }

    setIsConnecting(true);

    try {
      // Try to connect silently first (if already trusted)
      try {
        const response = await provider.connect({ onlyIfTrusted: true });
        const address = response.publicKey.toString();
        setPhantomAddress(address);
        return address;
      } catch {
        // If silent connection fails, request explicit connection
        const response = await provider.connect();
        const address = response.publicKey.toString();
        setPhantomAddress(address);
        toast.success('Phantom connesso!');
        return address;
      }
    } catch (error: any) {
      if (error.code === 4001) {
        toast.error('Connessione rifiutata', {
          description: 'Hai rifiutato la connessione a Phantom',
        });
      } else {
        toast.error('Errore connessione', {
          description: error.message || 'Impossibile connettersi a Phantom',
        });
      }
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [getProvider]);

  const disconnectPhantom = useCallback(async () => {
    const provider = getProvider();
    
    if (provider) {
      try {
        await provider.disconnect();
        setPhantomAddress(null);
        toast.success('Phantom disconnesso');
      } catch (error) {
        console.error('Error disconnecting Phantom:', error);
      }
    }
  }, [getProvider]);

  return {
    phantomInstalled,
    phantomAddress,
    isConnecting,
    connectPhantom,
    disconnectPhantom,
  };
}
