const SUPABASE_URL = "https://yhisjimuytbvahocmzum.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaXNqaW11eXRidmFob2NtenVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjkzOTgsImV4cCI6MjA3ODUwNTM5OH0.STN1ug49Sy74W-y7Wo-tXfy__beqS9mKH-MG46ZGJvA";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Mapeo de tablas reales y sus claves primarias
const tablaMap = {
  clientes: { name: "clientes", pk: "id_cliente" },
  mecanico: { name: "mecanicos", pk: "id_mec" },
  especialidad: { name: "especialidades", pk: "especialidad" },
  service: { name: "service", pk: "id" }
};

// Campos de cada tabla
const campos = {
  clientes: ["nombre", "vehiculo", "numero", "mecanico"],
  mecanico: ["nombre", "telefono", "especialidad"],
  especialidad: ["especialidad"],
  service: ["nombre", "vehiculo", "numero", "precio", "materiales", "fecha"]
};

const selector = document.getElementById("selector");
const container = document.getElementById("crud-container");
const form = document.getElementById("formulario");

// Variable para controlar si estamos editando
let editando = false;
let registroEditando = null;
let tablaActual = "";

// 🧱 Renderizar formulario dinámico
async function renderFormulario(tabla) {
  form.innerHTML = "";
  editando = false;
  registroEditando = null;
  tablaActual = tabla;

  const tituloForm = document.getElementById("titulo-form");
  tituloForm.textContent = "Agregar registro";

  // Caso especial para clientes - necesitamos mecánicos para el select
  if (tabla === "clientes") {
    await renderFormularioClientes();
    return;
  }

  // Caso especial para service - necesitamos mecánicos para el select
  if (tabla === "service") {
    await renderFormularioService();
    return;
  }

  // Formulario normal para otras tablas
  campos[tabla].forEach(campo => {
    const label = document.createElement("label");
    label.textContent = campo.charAt(0).toUpperCase() + campo.slice(1);

    const input = document.createElement("input");
    input.name = campo;
    input.required = true;
    
    // Definir tipos de input según el campo
    if (campo === "numero" || campo === "precio") {
      input.type = "number";
      if (campo === "precio") {
        input.step = "0.01";
        input.min = "0";
      }
    } else if (campo === "fecha") {
      input.type = "date";
    } else if (campo === "materiales") {
      input.type = "text";
      input.placeholder = "Lista de materiales separados por coma";
    } else {
      input.type = "text";
    }

    form.appendChild(label);
    form.appendChild(input);
  });

  const boton = document.createElement("button");
  boton.textContent = "Guardar";
  boton.type = "submit";
  form.appendChild(boton);

  form.onsubmit = crearSubmitHandler(tabla);
}

// 📋 Formulario especial para clientes
async function renderFormularioClientes() {
  // Obtener lista de mecánicos con sus especialidades
  const { data: mecanicos, error } = await supabase
    .from("mecanicos")
    .select("id_mec, nombre, especialidad")
    .order("nombre");

  if (error) {
    console.error("Error al cargar mecánicos:", error);
    alert("Error al cargar mecánicos: " + error.message);
    return;
  }

  // Campos del formulario de clientes
  const camposClientes = ["nombre", "vehiculo", "numero"];
  
  camposClientes.forEach(campo => {
    const label = document.createElement("label");
    label.textContent = campo.charAt(0).toUpperCase() + campo.slice(1);

    const input = document.createElement("input");
    input.name = campo;
    input.required = true;
    input.type = "text";

    form.appendChild(label);
    form.appendChild(input);
  });

  // Campo mecánico como select
  const labelMecanico = document.createElement("label");
  labelMecanico.textContent = "Mecánico";
  const selectMecanico = document.createElement("select");
  selectMecanico.name = "mecanico";
  selectMecanico.required = true;

  // Opción por defecto
  const optionDefault = document.createElement("option");
  optionDefault.value = "";
  optionDefault.textContent = "Selecciona un mecánico";
  selectMecanico.appendChild(optionDefault);

  // Opciones de mecánicos con nombre y especialidad
  mecanicos.forEach(mec => {
    const option = document.createElement("option");
    option.value = mec.id_mec; // Usar el ID numérico
    option.textContent = `${mec.nombre} - ${mec.especialidad}`;
    option.setAttribute('data-nombre', mec.nombre);
    selectMecanico.appendChild(option);
  });

  form.appendChild(labelMecanico);
  form.appendChild(selectMecanico);

  const boton = document.createElement("button");
  boton.textContent = "Guardar";
  boton.type = "submit";
  form.appendChild(boton);

  form.onsubmit = crearSubmitHandler("clientes");
}

// 📋 Formulario especial para service
async function renderFormularioService() {
  // Campos del formulario de service
  const camposService = ["nombre", "vehiculo", "numero", "precio", "materiales", "fecha"];
  
  camposService.forEach(campo => {
    const label = document.createElement("label");
    label.textContent = campo.charAt(0).toUpperCase() + campo.slice(1);

    const input = document.createElement("input");
    input.name = campo;
    input.required = true;
    
    if (campo === "numero" || campo === "precio") {
      input.type = "number";
      if (campo === "precio") {
        input.step = "0.01";
        input.min = "0";
      }
    } else if (campo === "fecha") {
      input.type = "date";
    } else if (campo === "materiales") {
      input.type = "text";
      input.placeholder = "Lista de materiales separados por coma";
    } else {
      input.type = "text";
    }

    form.appendChild(label);
    form.appendChild(input);
  });

  const boton = document.createElement("button");
  boton.textContent = "Guardar";
  boton.type = "submit";
  form.appendChild(boton);

  form.onsubmit = crearSubmitHandler("service");
}

// 🔧 Handler genérico para submit
function crearSubmitHandler(tabla) {
  return async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(form).entries());
    
    // Validar campos vacíos
    for (const campo in datos) {
      if (datos[campo].trim() === "") {
        alert("Todos los campos son obligatorios");
        return;
      }
    }

    // Convertir campos numéricos
    if (datos.numero) datos.numero = parseInt(datos.numero);
    if (datos.precio) datos.precio = parseFloat(datos.precio);
    if (datos.mecanico) datos.mecanico = parseInt(datos.mecanico);

    const tablaReal = tablaMap[tabla].name;
    
    if (editando && registroEditando) {
      // Modo edición
      const pk = tablaMap[tabla].pk;
      const id = registroEditando[pk];
      
      console.log("Actualizando registro:", { tabla: tablaReal, pk, id, datos });
      
      const { error } = await supabase
        .from(tablaReal)
        .update(datos)
        .eq(pk, id);
      
      if (error) {
        console.error("Error al actualizar:", error);
        alert("Error al actualizar: " + error.message);
      } else {
        alert("Registro actualizado correctamente");
        form.reset();
        editando = false;
        registroEditando = null;
        const tituloForm = document.getElementById("titulo-form");
        tituloForm.textContent = "Agregar registro";
        container.innerHTML = "<p>Actualizando...</p>";
        await renderTabla(tabla);
      }
    } else {
      // Modo inserción
      console.log("Insertando en tabla:", tablaReal, "Datos:", datos);
      
      const { error } = await supabase.from(tablaReal).insert([datos]);
      
      if (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar: " + error.message);
      } else {
        alert("Registro guardado correctamente");
        form.reset();
        container.innerHTML = "<p>Actualizando...</p>";
        await renderTabla(tabla);
      }
    }
  };
}

// ✏️ Función para editar registro
async function editarRegistro(tabla, id) {
  try {
    const tablaReal = tablaMap[tabla].name;
    const pk = tablaMap[tabla].pk;
    
    console.log("Editando registro:", { tabla, id, pk });
    
    // Obtener el registro completo desde la base de datos
    const { data, error } = await supabase
      .from(tablaReal)
      .select("*")
      .eq(pk, id)
      .single();
    
    if (error) {
      console.error("Error al obtener registro:", error);
      alert("Error al cargar registro: " + error.message);
      return;
    }
    
    if (!data) {
      alert("Registro no encontrado");
      return;
    }
    
    editando = true;
    registroEditando = data;
    tablaActual = tabla;
    
    const tituloForm = document.getElementById("titulo-form");
    tituloForm.textContent = "Editando registro";
    
    // Renderizar formulario específico para edición
    if (tabla === "clientes") {
      await renderFormularioClientesEdicion(data);
    } else if (tabla === "service") {
      await renderFormularioServiceEdicion(data);
    } else {
      await renderFormularioNormalEdicion(tabla, data);
    }
    
    // Scroll al formulario
    form.scrollIntoView({ behavior: 'smooth' });
    
  } catch (error) {
    console.error("Error en editarRegistro:", error);
    alert("Error al editar registro: " + error.message);
  }
}

// 📝 Formulario de clientes para edición
async function renderFormularioClientesEdicion(data) {
  // Obtener lista de mecánicos para el select
  const { data: mecanicos, error } = await supabase
    .from("mecanicos")
    .select("id_mec, nombre, especialidad")
    .order("nombre");

  if (error) {
    console.error("Error al cargar mecánicos:", error);
    alert("Error al cargar mecánicos: " + error.message);
    return;
  }

  form.innerHTML = "";

  // Campos del formulario de clientes
  const camposClientes = ["nombre", "vehiculo", "numero"];
  
  camposClientes.forEach(campo => {
    const label = document.createElement("label");
    label.textContent = campo.charAt(0).toUpperCase() + campo.slice(1);

    const input = document.createElement("input");
    input.name = campo;
    input.required = true;
    input.type = "text";
    input.value = data[campo] || "";

    form.appendChild(label);
    form.appendChild(input);
  });

  // Campo mecánico como select
  const labelMecanico = document.createElement("label");
  labelMecanico.textContent = "Mecánico";
  const selectMecanico = document.createElement("select");
  selectMecanico.name = "mecanico";
  selectMecanico.required = true;

  // Opciones de mecánicos con nombre y especialidad
  mecanicos.forEach(mec => {
    const option = document.createElement("option");
    option.value = mec.id_mec;
    option.textContent = `${mec.nombre} - ${mec.especialidad}`;
    // Seleccionar el mecánico actual
    if (mec.id_mec === data.mecanico) {
      option.selected = true;
    }
    selectMecanico.appendChild(option);
  });

  form.appendChild(labelMecanico);
  form.appendChild(selectMecanico);

  const boton = document.createElement("button");
  boton.textContent = "Actualizar";
  boton.type = "submit";
  form.appendChild(boton);

  form.onsubmit = crearSubmitHandler("clientes");
}

// 📝 Formulario de service para edición
async function renderFormularioServiceEdicion(data) {
  form.innerHTML = "";

  // Campos del formulario de service
  const camposService = ["nombre", "vehiculo", "numero", "precio", "materiales", "fecha"];
  
  camposService.forEach(campo => {
    const label = document.createElement("label");
    label.textContent = campo.charAt(0).toUpperCase() + campo.slice(1);

    const input = document.createElement("input");
    input.name = campo;
    input.required = true;
    
    if (campo === "numero" || campo === "precio") {
      input.type = "number";
      if (campo === "precio") {
        input.step = "0.01";
        input.min = "0";
      }
    } else if (campo === "fecha") {
      input.type = "date";
      // Formatear fecha para input type="date"
      if (data[campo]) {
        const fecha = new Date(data[campo]);
        input.value = fecha.toISOString().split('T')[0];
      }
    } else if (campo === "materiales") {
      input.type = "text";
      input.placeholder = "Lista de materiales separados por coma";
    } else {
      input.type = "text";
    }

    if (data[campo] && campo !== "fecha") {
      input.value = data[campo];
    }

    form.appendChild(label);
    form.appendChild(input);
  });

  const boton = document.createElement("button");
  boton.textContent = "Actualizar";
  boton.type = "submit";
  form.appendChild(boton);

  form.onsubmit = crearSubmitHandler("service");
}

// 📝 Formulario normal para edición
async function renderFormularioNormalEdicion(tabla, data) {
  form.innerHTML = "";

  campos[tabla].forEach(campo => {
    const label = document.createElement("label");
    label.textContent = campo.charAt(0).toUpperCase() + campo.slice(1);

    const input = document.createElement("input");
    input.name = campo;
    input.required = true;
    
    if (campo === "numero" || campo === "precio") {
      input.type = "number";
      if (campo === "precio") {
        input.step = "0.01";
        input.min = "0";
      }
    } else if (campo === "fecha") {
      input.type = "date";
    } else if (campo === "materiales") {
      input.type = "text";
      input.placeholder = "Lista de materiales separados por coma";
    } else {
      input.type = "text";
    }

    if (data[campo] !== null && data[campo] !== undefined) {
      if (input.type === 'date' && data[campo]) {
        const fecha = new Date(data[campo]);
        input.value = fecha.toISOString().split('T')[0];
      } else {
        input.value = data[campo];
      }
    }

    form.appendChild(label);
    form.appendChild(input);
  });

  const boton = document.createElement("button");
  boton.textContent = "Actualizar";
  boton.type = "submit";
  form.appendChild(boton);

  form.onsubmit = crearSubmitHandler(tabla);
}

// 🧾 Renderizar tabla - MOSTRAR NOMBRE DEL MECÁNICO EN LUGAR DEL ID
async function renderTabla(tabla) {
  try {
    const tablaReal = tablaMap[tabla].name;
    console.log("Cargando tabla:", tablaReal);
    
    let data;
    let error;

    // Caso especial para clientes - necesitamos unir con mecánicos
    if (tabla === "clientes") {
      const { data: clientesData, error: clientesError } = await supabase
        .from(tablaReal)
        .select(`
          *,
          mecanicos (
            nombre,
            especialidad
          )
        `);
      
      data = clientesData;
      error = clientesError;
    } else {
      const { data: tablaData, error: tablaError } = await supabase.from(tablaReal).select("*");
      data = tablaData;
      error = tablaError;
    }
    
    if (error) {
      console.error("Error al cargar datos:", error);
      container.innerHTML = `<p>Error al cargar datos: ${error.message}</p>`;
      return;
    }

    console.log("Datos recibidos:", data);

    if (!data || data.length === 0) {
      container.innerHTML = "<p>No hay registros.</p>";
      return;
    }

    let html = `<h2>${tabla.toUpperCase()}</h2>`;
    html += `<table><thead><tr>`;
    
    // Encabezados de columnas - OCULTAR la columna "mecanico" y mostrar solo "Mecánico"
    for (const col in data[0]) {
      let nombreColumna = col;
      
      // Saltar la columna "mecanico" (ID) para clientes
      if (tabla === "clientes" && col === "mecanico") {
        continue;
      }
      
      // Renombrar columnas de ID
      if (col === "id_mec" || col === "id_cliente" || col === "id") {
        nombreColumna = "ID";
      } else if (col === "mecanicos") {
        nombreColumna = "Mecánico";
      }
      html += `<th>${nombreColumna}</th>`;
    }
    html += `<th>Acciones</th></tr></thead><tbody>`;

    // Filas de datos
    for (const row of data) {
      html += `<tr>`;
      for (const col in row) {
        let valor = row[col];
        
        // Saltar la columna "mecanico" (ID) para clientes
        if (tabla === "clientes" && col === "mecanico") {
          continue;
        }
        
        // Mostrar nombre y especialidad del mecánico
        if (col === "mecanicos" && tabla === "clientes" && row.mecanicos) {
          valor = `${row.mecanicos.nombre} - ${row.mecanicos.especialidad}`;
        }
        // Manejar valores null o undefined
        else if (valor === null || valor === undefined) {
          valor = "";
        }
        // Si es el objeto mecanicos, mostrar el valor formateado
        else if (col === "mecanicos") {
          continue; // Ya lo mostramos arriba
        }
        
        html += `<td>${valor}</td>`;
      }
      
      // Botones de acciones
      const pk = tablaMap[tabla].pk;
      const pkValue = row[pk];
      
      html += `<td>`;
      
      // Botón editar
      if (tabla === "mecanico" || tabla === "clientes" || tabla === "service") {
        html += `<button onclick="editarRegistro('${tabla}', ${pkValue})" style="margin-right: 5px; background: #ff9800; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">✏️ Editar</button>`;
      }
      
      // Botón eliminar
      if (tabla === "especialidad") {
        html += `<button onclick="borrar('${tabla}', '${pkValue}')" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">🗑️ Eliminar</button>`;
      } else {
        html += `<button onclick="borrar('${tabla}', ${pkValue})" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">🗑️ Eliminar</button>`;
      }
      
      html += `</td></tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
    
  } catch (error) {
    console.error("Error en renderTabla:", error);
    container.innerHTML = `<p>Error al renderizar la tabla: ${error.message}</p>`;
  }
}

// 🗑️ Eliminar registro
async function borrar(tabla, valor) {
  if (!confirm("¿Eliminar registro?")) return;
  
  try {
    const tablaReal = tablaMap[tabla].name;
    const pk = tablaMap[tabla].pk;
    
    console.log(`Eliminando de ${tablaReal} donde ${pk} = ${valor}`);
    
    const { error } = await supabase.from(tablaReal).delete().eq(pk, valor);
    
    if (error) {
      console.error("Error al eliminar:", error);
      alert("Error al eliminar: " + error.message);
    } else {
      alert("Registro eliminado correctamente");
      await renderTabla(tabla);
    }
  } catch (error) {
    console.error("Error en borrar:", error);
    alert("Error al eliminar: " + error.message);
  }
}

// 📂 Eventos
selector.addEventListener("change", (e) => {
  tablaActual = e.target.value;
  renderFormulario(tablaActual);
  renderTabla(tablaActual);
});

document.addEventListener("DOMContentLoaded", () => {
  tablaActual = selector.value;
  renderFormulario(tablaActual);
  renderTabla(tablaActual);
});