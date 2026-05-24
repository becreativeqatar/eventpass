'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { useEventContext } from '@/contexts/event-context';

interface ImportError {
  row: number;
  error: string;
}

export default function ImportPage() {
  const { selectedProject, isLoading, isReadOnly } = useEventContext();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imported?: number;
    errors?: ImportError[];
    message?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!selectedProject) {
      setError('No active event');
      return;
    }
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', selectedProject.id);

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Import failed');
        if (data.errors) {
          setResult({ errors: data.errors });
        }
      } else {
        setResult(data);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      console.error('Import failed:', err);
      setError('Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Role', 'Phases'];
    const example = ['John', 'Doe', 'john@example.com', '+974 1234 5678', 'ABC Corp', 'Photographer', 'BUMP_IN,LIVE,BUMP_OUT'];

    const csvContent = [headers.join(','), example.join(',')].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accreditation-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!selectedProject) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-semibold mb-2">No Active Event</h2>
        <p className="text-muted-foreground mb-4">Activate an event to import records.</p>
        <Link href="/admin/events"><Button>Manage Events</Button></Link>
      </div>
    );
  }

  if (isReadOnly) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium mb-2">Not available</h3>
            <p className="text-muted-foreground">Import is only available for active events. Switch to an active event to import records.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Import</h1>
        <p className="text-muted-foreground">
          Import accreditations into <strong>{selectedProject.name}</strong>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Import Accreditations</CardTitle>
            <CardDescription>Upload an Excel file (.xlsx) with accreditation data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Excel File</Label>
              <input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  cursor-pointer"
              />
              {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {result?.message && <Alert><AlertDescription>{result.message}</AlertDescription></Alert>}

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={loading || !file}>
                {loading ? 'Importing...' : 'Import'}
              </Button>
              <Button variant="outline" onClick={downloadTemplate}>Download Template</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>File Format</CardTitle>
            <CardDescription>Required columns for the import file</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">First Name</TableCell><TableCell>Yes</TableCell><TableCell>Person&apos;s first name</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Last Name</TableCell><TableCell>Yes</TableCell><TableCell>Person&apos;s last name</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Email</TableCell><TableCell>No</TableCell><TableCell>Email address</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Phone</TableCell><TableCell>No</TableCell><TableCell>Phone number</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Company</TableCell><TableCell>No</TableCell><TableCell>Company name</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Role</TableCell><TableCell>No</TableCell><TableCell>Job role/title</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Phases</TableCell><TableCell>No</TableCell><TableCell>BUMP_IN, LIVE, BUMP_OUT (comma-separated)</TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {result?.errors && result.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Errors</CardTitle>
            <CardDescription>The following rows had errors and were skipped</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.errors.map((err, idx) => (
                  <TableRow key={idx}><TableCell>{err.row}</TableCell><TableCell>{err.error}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
