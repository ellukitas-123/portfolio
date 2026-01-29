import { getCombinedContributions } from '../../../utils/getContributions';

export const prerender = false;

export async function GET({ params }: { params: Record<string, string> }) {
  const username = params.username || 'ellukitas-123';
  try {
    const data = await getCombinedContributions(username);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
