export interface NewsArticle {
  title: string
  description: string
  pubDate: string
}

export async function fetchNewsForCompany(companyName: string): Promise<NewsArticle[]> {
  const query = encodeURIComponent(`${companyName} India`)
  const url = `https://newsdata.io/api/1/latest?apikey=${process.env.NEWSDATA_API_KEY}&q=${query}&country=in&language=en&size=5`

  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return []
    const data = await res.json()
    if (data.status !== 'success') return []

    return (data.results || []).map((item: Record<string, string>) => ({
      title: item.title || '',
      description: item.description || '',
      pubDate: item.pubDate || '',
    }))
  } catch {
    return []
  }
}
