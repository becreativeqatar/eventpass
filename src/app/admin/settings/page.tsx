'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
      }));

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsArray }),
      });

      if (!res.ok) {
        throw new Error('Failed to save settings');
      }

      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleBoolSetting = (key: string) => {
    const currentValue = settings[key] === 'true';
    updateSetting(key, (!currentValue).toString());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure application settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded ${
            message.type === 'success'
              ? 'bg-success/10 border border-success/20 text-success'
              : 'bg-destructive/10 border border-destructive/20 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
            <CardDescription>General application settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appName">Application Name</Label>
              <Input
                id="appName"
                value={settings['app.name'] || ''}
                onChange={(e) => updateSetting('app.name', e.target.value)}
                placeholder="BCE EventPass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appLogo">Logo URL</Label>
              <Input
                id="appLogo"
                value={settings['app.logo'] || ''}
                onChange={(e) => updateSetting('app.logo', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                URL to your application logo (optional)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scanning</CardTitle>
            <CardDescription>QR code scanning settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireLocation"
                checked={settings['scan.requireLocation'] === 'true'}
                onCheckedChange={() => toggleBoolSetting('scan.requireLocation')}
              />
              <Label htmlFor="requireLocation" className="cursor-pointer">
                Require location for scans
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowMultipleScans"
                checked={settings['scan.allowMultipleScansPerPhase'] === 'true'}
                onCheckedChange={() => toggleBoolSetting('scan.allowMultipleScansPerPhase')}
              />
              <Label htmlFor="allowMultipleScans" className="cursor-pointer">
                Allow multiple scans per phase
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Email notification settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="emailEnabled"
                checked={settings['notifications.emailEnabled'] === 'true'}
                onCheckedChange={() => toggleBoolSetting('notifications.emailEnabled')}
              />
              <Label htmlFor="emailEnabled" className="cursor-pointer">
                Enable email notifications
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={settings['notifications.adminEmail'] || ''}
                onChange={(e) => updateSetting('notifications.adminEmail', e.target.value)}
                placeholder="admin@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Email address for system notifications
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
            <CardDescription>Photo storage configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Photo storage is configured via environment variables:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li><code>NEXT_PUBLIC_SUPABASE_URL</code></li>
                <li><code>SUPABASE_SERVICE_ROLE_KEY</code></li>
                <li><code>SUPABASE_BUCKET</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
