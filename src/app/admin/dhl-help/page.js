'use client'
import { useState } from 'react'
import { AlertCircle, CheckCircle, Clock, RefreshCw, Settings, Phone } from 'lucide-react'

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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🚚 Diagnoza i Pomoc DHL API
        </h1>
        <p className="text-gray-600">
          Narzędzie do diagnozy problemów z integracją DHL i testowania różnych konfiguracji
        </p>
      </div>

      {/* Przyciski akcji */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={runDiagnosis}
          disabled={loading}
          className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Clock className="animate-spin" size={20} /> : <RefreshCw size={20} />}
          <span>{loading ? 'Uruchamianie diagnozy...' : 'Uruchom pełną diagnozę'}</span>
        </button>

        <div className="flex items-center space-x-2 px-4 py-3 bg-gray-50 rounded-lg">
          <Settings size={20} className="text-gray-600" />
          <span className="text-gray-700">Sprawdź zmienne środowiskowe w Vercel</span>
        </div>
      </div>

      {/* Test własnych danych logowania */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🧪 Test własnych danych logowania
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
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numer konta
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
                {diagnosis.success ? 'Diagnoza ukończona' : 'Wystąpiły problemy'}
              </h2>
            </div>
            
            {diagnosis.error && (
              <div className="bg-red-100 border border-red-200 rounded p-4 mb-4">
                <p className="text-red-800 font-medium">Błąd: {diagnosis.error}</p>
              </div>
            )}
          </div>

          {/* Środowisko */}
          {diagnosis.environment && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📋 Zmienne środowiskowe
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(diagnosis.environment).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium text-gray-700">{key}:</span>
                    <span className={`text-sm ${
                      value.toString().includes('✅') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {value.toString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Testy połączeń */}
          {diagnosis.diagnosis?.tests?.credentialCombinations && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🔐 Testy różnych konfiguracji logowania
              </h3>
              
              {diagnosis.diagnosis.tests.credentialCombinations.workingVariants?.length > 0 ? (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
                  <h4 className="font-medium text-green-800 mb-2">
                    ✅ Znaleziono działające konfiguracje:
                  </h4>
                  {diagnosis.diagnosis.tests.credentialCombinations.workingVariants.map((variant, index) => (
                    <div key={index} className="mb-2">
                      <span className="font-medium">{variant.name}</span>
                      <span className="text-sm text-gray-600 ml-2">({variant.wsdl})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
                  <h4 className="font-medium text-red-800">
                    ❌ Brak działających konfiguracji
                  </h4>
                </div>
              )}

              <div className="space-y-3">
                {diagnosis.diagnosis.tests.credentialCombinations.results?.map((result, index) => (
                  <div
                    key={index}
                    className={`border rounded p-4 ${getStatusColor(result.success)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(result.success)}
                        <span className="font-medium">{result.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">{result.wsdl?.split('/').pop()}</span>
                    </div>
                    
                    {result.error && (
                      <div className="mt-2 text-sm text-red-600">
                        <strong>Błąd:</strong> {result.error}
                      </div>
                    )}
                    
                    {result.errorDetails?.isAuthError && (
                      <div className="mt-2 text-sm text-red-700 bg-red-100 p-2 rounded">
                        🔐 Błąd autoryzacji (Kod: {result.errorDetails.faultCode})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zalecenia */}
          {(diagnosis.nextSteps || diagnosis.possibleSolutions) && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                💡 Zalecane działania
              </h3>
              
              {diagnosis.nextSteps && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-2">Następne kroki:</h4>
                  <ul className="space-y-2">
                    {diagnosis.nextSteps.map((step, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {diagnosis.possibleSolutions && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Możliwe rozwiązania:</h4>
                  <ul className="space-y-2">
                    {diagnosis.possibleSolutions.map((solution, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-green-600 mt-1">•</span>
                        <span className="text-gray-700">{solution}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
                <strong>Jeśli wszystkie testy nie powiodły się, skontaktuj się z DHL:</strong>
              </p>
              <ul className="space-y-1 text-sm">
                <li>📧 Email: dhl24@dhl.com</li>
                <li>📞 Telefon: +48 42 345 345 0</li>
                <li>🌐 Panel: <a href="https://sandbox.dhl24.com.pl" className="underline" target="_blank">sandbox.dhl24.com.pl</a></li>
                <li>📋 Podaj swój login: <strong>{diagnosis.environment?.DHL_LOGIN?.replace('✅ SET (', '').replace(')', '') || 'NIEZNANY'}</strong></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Instrukcje debugowania */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🔧 Debugowanie krok po kroku
        </h3>
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <strong>1. Sprawdź zmienne środowiskowe w Vercel:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• DHL_LOGIN - login do DHL (np. GRUPAELTRON_TEST)</li>
              <li>• DHL_PASSWORD_DHL24 - hasło do DHL24</li>
              <li>• DHL_ACCOUNT_NUMBER - numer konta ServicePoint (np. 6000000)</li>
              <li>• DHL_TEST_MODE=true - tryb testowy</li>
            </ul>
          </div>
          <div>
            <strong>2. Sprawdź w panelu DHL:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Czy konto jest aktywne</li>
              <li>• Czy masz dostęp do API ServicePoint</li>
              <li>• Czy numer konta ServicePoint jest prawidłowy</li>
            </ul>
          </div>
          <div>
            <strong>3. Typowe błędy:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Kod 301 - błąd autoryzacji (nieprawidłowe dane lub nieaktywne konto)</li>
              <li>• Timeout - problem z połączeniem</li>
              <li>• Invalid structure - błędna struktura danych</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
