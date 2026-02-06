'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Bell, Shield, Palette, Key, Copy, Check, Trash2, Plus, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ApiToken {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

function ApiTokensSection() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch('/api/tokens');
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const generateToken = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Desktop App' }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewToken(data.token);
        fetchTokens();
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const revokeToken = async (id: string) => {
    try {
      const res = await fetch(`/api/tokens?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTokens(tokens.filter((t) => t.id !== id));
      }
    } catch {
      // ignore
    }
  };

  const copyToken = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
            <Key className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <CardTitle className="text-base">API Tokens</CardTitle>
            <CardDescription>
              Authenticate the desktop recorder app
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New token display */}
        {newToken && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="mb-2 text-sm font-medium text-green-800">
              Token created! Copy it now — you won&apos;t see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-xs text-green-900 border">
                {newToken}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToken}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-green-600">
              Paste this token in the desktop app: Preferences → Account → API Token
            </p>
          </div>
        )}

        {/* Existing tokens */}
        {loading ? (
          <p className="text-sm text-stone-400">Loading tokens...</p>
        ) : tokens.length > 0 ? (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-stone-400" />
                  <div>
                    <p className="text-sm font-medium text-stone-700">
                      {token.name}
                    </p>
                    <p className="text-xs text-stone-400">
                      Created{' '}
                      {new Date(token.created_at).toLocaleDateString()}
                      {token.last_used_at && (
                        <>
                          {' · '}Last used{' '}
                          {new Date(token.last_used_at).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeToken(token.id)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400">
            No tokens yet. Generate one to connect the desktop app.
          </p>
        )}

        {/* Generate button */}
        <Button
          onClick={generateToken}
          disabled={generating}
          variant="outline"
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {generating ? 'Generating...' : 'Generate New Token'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const settingsSections = [
    {
      id: 'profile',
      icon: User,
      title: 'Profile',
      description: 'Manage your personal information',
      comingSoon: true,
    },
    {
      id: 'notifications',
      icon: Bell,
      title: 'Notifications',
      description: 'Configure your notification preferences',
      comingSoon: true,
    },
    {
      id: 'security',
      icon: Shield,
      title: 'Security',
      description: 'Password and authentication',
      comingSoon: true,
    },
    {
      id: 'appearance',
      icon: Palette,
      title: 'Appearance',
      description: 'Theme and customization',
      comingSoon: true,
    },
  ];

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center text-sm text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to dashboard
      </Link>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage your preferences and account settings
        </p>
      </div>

      {/* API Tokens Section - Desktop App */}
      <div className="mb-8">
        <ApiTokensSection />
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.id}
              className={`relative overflow-hidden transition-all hover:shadow-md ${
                section.comingSoon ? 'opacity-75' : 'cursor-pointer'
              }`}
            >
              {section.comingSoon && (
                <div className="absolute right-2 top-2">
                  <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-600">
                    Coming soon
                  </span>
                </div>
              )}
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100">
                  <Icon className="h-5 w-5 text-stone-600" />
                </div>
                <div>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{section.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
