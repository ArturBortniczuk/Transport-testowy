'use client'
import { useState } from 'react'
import { AlertCircle, CheckCircle, Clock, RefreshCw, Settings, Phone, Truck, TestTube, Key, Database } from 'lucide-react'

export default function DHLHelpPage() {
  const [diagnosis, setDiagnosis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [testCredentials, setTestCredentials] = useState({
    login: '',
    password: '',
    accountNumber: ''
  })

  const runDiagnosis = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-dhl')
      const data = await response.json()
      setDiagnosis(data)
    } catch (error) {
      console.error('Błąd diagnozy:', error)
      setDiagnosis({
        success: false,
        error: 'Nie udało się połączyć z API',
        recommendations: ['Sprawdź połączenie internetowe', 'Spróbuj ponownie za chwilę']
      })
    } finally {
      setLoading(false)
    }
  }

  const testCustomCredentials = async () => {
    if (!testCredentials.login || !testCredentials.password || !testCredentials.accountNumber) {
      alert('Wypełnij wszystkie pola')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/test-dhl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testCredentials: testCredentials
        })
      })
      const data = await response.json()
      setDiagnosis(data)
    } catch (error) {
      console.error('Błąd testu credentials:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (success) => {
    if (success) return <CheckCircle className="text-green-600" size={20} />
    return <AlertCircle className="text-red-600" size={20} />
  }

  const getStatusColor = (success) => {
    return success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center">
          <Truck className="mr-3 text-blue-600" size={36} />
          Diagnoza i Pomoc DHL WebAPI2
        </h1>
        <p className="text-gray-600">
          Narzędzie do diagnozy problemów z integracją DHL WebAPI2 i testowania różnych konfiguracji
        </p>
      </div>

      {/* Przyciski akcji */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={runDiagnosis}
          disabled={loading}
          className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Clock className="animate-spin" size={20} /> : <TestTube size={20} />}
          <span>{loading ? 'Testowanie...' : 'Test DHL createShipments'}</span>
        </button>

        <div className="flex items-center space-x-2 px-4 py-3 bg-gray-50 rounded-lg">
          <Settings size={20} className="text-gray-600" />
          <span className="text-gray-700">Sprawdź zmienne w Vercel</span>
        </div>

        <div className="flex items-center space-x-2 px-4 py-3 bg-orange-50 rounded-lg">
          <Key size={20} className="text-orange-600" />
          <span className="text-orange-700">WebAPI2 (createShipments)</span>
        </div>
      </div>

      {/* Aktualne dane konfiguracyjne */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4 flex items-center">
          <Database className="mr-2" size={24} />
          Poprawne dane DHL z maila (26.06.2025)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold text-blue-800 mb-2">WebAPI2 (Zalecane)</h3>
            <div className="space-y-1 font-mono text-xs">
              <div><strong>Login:</strong> GRUPAELTRON_TEST</div>
              <div><strong>Hasło:</strong> 3by#aCgl:pJMGu!</div>
              <div><strong>Konto SAP:</strong> 6000000</div>
              <div><strong>URL:</strong> https://sandbox.dhl24.com.pl/webapi2</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold text-gray-800 mb-2">ServicePoint (Backup)</h3>
            <div className="space-y-1 font-mono text-xs">
              <div><strong>Login:</strong> GRUPAELTRON_TEST_PS</div>
              <div><strong>Hasło:</strong> THp4UY6W5hUWUE</div>
              <div><strong>Konto SAP:</strong> 6000000</div>
              <div><strong>URL:</strong> https://sandbox.dhl24.com.pl/servicepoint</div>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-100 rounded border border-blue-300">
          <p className="text-blue-800 text-sm">
            <strong>⚠️ Ważne:</strong> W haśle WebAPI2 jest mała litera "l" (el), nie wielka "J" (jay): 
            <code className="bg-white px-1 rounded">3by#aC<strong>gl</strong>:pJMGu!</code>
          </p>
        </div>
      </div>

      {/* Test własnych danych logowania */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <TestTube className="mr-2 text-green-600" size={24} />
          Test własnych danych logowania
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Login DHL
            </label>
            <input
              type="text"
              value={testCredentials.login}
              onChange={(e) => setTestCredentials(prev => ({ ...prev, login: e.target.value }))}
              placeholder="GRUPAELTRON_TEST"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasło DHL
            </label>
            <input
              type="password"
              value={testCredentials.password}
              onChange={(e) => setTestCredentials(prev => ({ ...prev, password: e.target.value }))}
              placeholder="3by#aCgl:pJMGu!"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numer konta SAP
            </label>
            <input
              type="text"
              value={testCredentials.accountNumber}
              onChange={(e) => setTestCredentials(prev => ({ ...prev, accountNumber: e.target.value }))}
              placeholder="6000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <button
          onClick={testCustomCredentials}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Testuj te dane
        </button>
      </div>

      {/* Wyniki diagnozy */}
      {diagnosis && (
        <div className="space-y-6">
          {/* Status główny */}
          <div className={`rounded-lg border p-6 ${
            diagnosis.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center space-x-3 mb-4">
              {getStatusIcon(diagnosis.success)}
              <h2 className="text-xl font-semibold">
                {diagnosis.success ? 'Test zakończony' : 'Wystąpiły problemy'}
              </h2>
            </div>
            
            {diagnosis.error && (
              <div className="bg-red-100 border border-red-200 rounded p-4 mb-4">
                <p className="text-red-800 font-medium">Błąd: {diagnosis.error}</p>
              </div>
            )}

            {diagnosis.result && (
              <div className="bg-blue-100 border border-blue-200 rounded p-4">
                <p className="text-blue-800 font-medium">{diagnosis.result}</p>
              </div>
            )}
          </div>

          {/* Wyniki testu createShipments */}
          {diagnosis.createShipmentsTest && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Truck className="mr-2 text-blue-600" size={20} />
                Test createShipments (WebAPI2)
              </h3>
              
              <div className={`border rounded p-4 ${getStatusColor(diagnosis.createShipmentsTest.success)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(diagnosis.createShipmentsTest.success)}
                    <span className="font-medium">
                      {diagnosis.createShipmentsTest.success ? 'Sukces!' : 'Niepowodzenie'}
                    </span>
                  </div>
                  {diagnosis.createShipmentsTest.shipmentId && (
                    <span className="text-sm bg-white px-2 py-1 rounded border font-mono">
                      ID: {diagnosis.createShipmentsTest.shipmentId}
                    </span>
                  )}
                </div>
                
                {diagnosis.createShipmentsTest.error && (
                  <div className="mt-2 text-sm text-red-600">
                    <strong>Błąd:</strong> {diagnosis.createShipmentsTest.error}
                  </div>
                )}

                {diagnosis.createShipmentsTest.success && (
                  <div className="mt-2 text-sm text-green-700">
                    ✅ DHL WebAPI2 działa poprawnie! Przesyłka została utworzona w systemie.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Środowisko */}
          {diagnosis.environment && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="mr-2 text-gray-600" size={20} />
                Zmienne środowiskowe
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(diagnosis.environment).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium text-gray-700">{key}:</span>
                    <span className={`text-sm ${
                      value?.toString().includes('SET') || value?.toString().includes('GRUPAELTRON') || value?.toString().includes('6000000')
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {value?.toString() || 'BRAK'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kontakt z supportem */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Phone className="text-blue-600" size={24} />
              <h3 className="text-lg font-semibold text-blue-900">
                Kontakt z DHL Support
              </h3>
            </div>
            <div className="text-blue-800">
              <p className="mb-2">
                <strong>Jeśli testy nie przechodzą, skontaktuj się z DHL:</strong>
              </p>
              <ul className="space-y-1 text-sm">
                <li>📧 Email: <strong>pl.cim@dhl.com</strong></li>
                <li>📞 Telefon: <strong>+48 42 345 345 0</strong></li>
                <li>🌐 Panel sandbox: <a href="https://sandbox.dhl24.com.pl" className="underline" target="_blank" rel="noopener noreferrer">sandbox.dhl24.com.pl</a></li>
                <li>📋 Podaj swój login: <strong>GRUPAELTRON_TEST</strong></li>
                <li>🔧 Powiedz: <strong>"Problemy z WebAPI2 createShipments - błąd autoryzacji"</strong></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Instrukcje krok po kroku */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <RefreshCw className="mr-2" size={20} />
          Instrukcje krok po kroku
        </h3>
        
        <div className="space-y-6 text-sm text-gray-700">
          <div>
            <strong className="text-blue-800">1. Ustaw zmienne środowiskowe w Vercel:</strong>
            <div className="mt-2 bg-white p-3 rounded border font-mono text-xs">
              <div>DHL_LOGIN=<strong>GRUPAELTRON_TEST</strong></div>
              <div>DHL_PASSWORD_DHL24=<strong>3by#aCgl:pJMGu!</strong></div>
              <div>DHL_ACCOUNT_NUMBER=<strong>6000000</strong></div>
              <div>DHL_TEST_MODE=<strong>false</strong></div>
            </div>
            <p className="mt-2 text-red-600 font-medium">
              ⚠️ Uwaga: W haśle jest mała litera "l" (el), nie wielka "J" (jay)!
            </p>
          </div>
          
          <div>
            <strong className="text-green-800">2. Po zmianie zmiennych w Vercel:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Przejdź do zakładki "Deployments"</li>
              <li>• Kliknij "Redeploy" na najnowszym deployment</li>
              <li>• Poczekaj na przebudowanie (2-3 minuty)</li>
            </ul>
          </div>
          
          <div>
            <strong className="text-purple-800">3. Przetestuj integrację:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Kliknij "Test DHL createShipments" powyżej</li>
              <li>• Sprawdź czy otrzymujesz shipmentId</li>
              <li>• Jeśli tak - integracja działa!</li>
            </ul>
          </div>
          
          <div>
            <strong className="text-orange-800">4. Testuj w module kuriera:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Przejdź do /kurier</li>
              <li>• Dodaj testowe zamówienie</li>
              <li>• Zatwierdź je</li>
              <li>• Sprawdź czy generuje prawdziwy numer DHL</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Różnice API */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-4">
          🔄 Różnica: WebAPI2 vs ServicePoint
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-green-800 mb-2">✅ WebAPI2 (Używamy)</h4>
            <ul className="space-y-1 text-green-700">
              <li>• Metoda: <code>createShipments</code></li>
              <li>• Pełna funkcjonalność DHL</li>
              <li>• Wszystkie typy przesyłek</li>
              <li>• Przesyłki międzynarodowe</li>
              <li>• Lepsze wsparcie DHL</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-orange-800 mb-2">⚠️ ServicePoint (Backup)</h4>
            <ul className="space-y-1 text-orange-700">
              <li>• Metoda: <code>createShipment</code></li>
              <li>• Ograniczona funkcjonalność</li>
              <li>• Głównie punkty obsługi</li>
              <li>• Tylko przesyłki krajowe</li>
              <li>• Starsze API</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
