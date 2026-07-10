import { useState } from 'react';
import { subirArchivo } from '../lib/evidenciasService';

function TestSupabase() {
  const [archivo, setArchivo] = useState(null);

  const handleSubir = async () => {
    if (!archivo) {
      alert('Seleccione un archivo');
      return;
    }

    try {
      await subirArchivo(
        archivo,
        '123456',
        'Diseño Curricular',
        'PRUEBA'
      );

      alert('Archivo subido correctamente');
    } catch (error) {
      console.error(error);
      alert('Error al subir archivo');
    }
  };

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">
        Prueba de subida
      </h1>

      <input
        type="file"
        onChange={(e) => setArchivo(e.target.files[0])}
      />

      <button
        onClick={handleSubir}
        className="bg-blue-600 text-white px-4 py-2 rounded ml-4"
      >
        Subir
      </button>
    </div>
  );
}

export default TestSupabase;