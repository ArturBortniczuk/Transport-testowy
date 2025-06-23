'use client'
import { useState, useEffect } from 'react'
import ZamowieniaList from '../kurier/components/ZamowieniaList'
import Link from 'next/link'
import { ArrowLeft, Archive } from 'lucide-react'

export default function ArchiwumKurierPage() {
  const [zamowienia, setZamowienia] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Pobierz zrealizowane zamówienia przy ładowaniu
  useEffect(() => {
    fetchArchiwalneZamowienia()
  }, [])

  const fetchArchiwalneZamowienia = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/kurier?status=completed')
      const data = await response.json()
      
      if (data.success) {
        setZamowienia(data.zamowienia)
      } else {
        setError(data.error)
      }
    } catch (error) {
      console.error('Błąd pobierania archiwalnych zamówień:', error)
      setError('Nie udało się pobrać archiwalnych zamówień kurierskich')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Nagłówek z nawigacją */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link 
            href="/kurier" 
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Wróć do aktywnych zamówień
          </Link>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Archive className="mr-3 text-gray-600" />
              Archiwum zamówień kuriera
            </h1>
            <p className="text-gray-600 mt-2">
              Historia zrealizowanych zamówień kurierskich
            </p>
          </div>
          
          {/* Statystyki */}
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{zamowienia.length}</div>
            <div className="text-sm text-gray-600">Zrealizowanych zamówień</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          Błąd: {error}
        </div>
      )}

      {/* Lista archiwalnych zamówień */}
      <ZamowieniaList
        zamowienia={zamowienia}
        onZatwierdz={() => {}} // Brak akcji dla archiwalnych
        onUsun={() => {}} // Brak akcji dla archiwalnych
        userRole="archive" // Specjalna rola dla archiwum
        canApprove={false} // Brak możliwości zatwierdzania w archiwum
        loading={loading}
        isArchive={true} // Nowy prop informujący o trybie archiwum
      />
    </div>
  )
}
