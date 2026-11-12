/**
 * Catálogo de Rutas y Recorridos Preestablecidos de Telecomunicaciones
 * Incluye corredores principales, enlaces de Google Maps, continuidades geográficas
 * y secuencias de paradas para la creación automática de planes y rutas.
 */

(function () {
  const root = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this);

  const PRESET_ROUTES = [
    // ---------------------------------------------------------
    // CORREDORES PRINCIPALES Y CONTINUIDADES
    // ---------------------------------------------------------
    {
      id: 'corredor-chilpancingo-atlixtac',
      name: 'Ruta Chilpancingo - Atlixtac',
      category: 'Chilpancingo / Centro',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/x7BZAzmDZ7B2QAL4A',
      stops: ['Nuevo Balzamar', 'El Palmar', 'Atlixtac'],
      continuations: [],
      notes: 'Corredor hacia la Montaña baja saliendo desde Chilpancingo.'
    },
    {
      id: 'corredor-chilpancingo-iguala',
      name: 'Ruta Chilpancingo - Iguala',
      category: 'Chilpancingo / Norte',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/bLtgPSxBvy1mvBXP7',
      stops: ['Xochipala', 'Venta Vieja', 'Tlamamacan', 'Xalitla', 'Maxela', 'Tonalapa del Sur', 'Palula', 'Venta de Palula', 'Tecuexcontitlán'],
      continuations: [
        {
          name: 'Continuidad Sasamulco - Tlacuitlapa',
          mapsUrl: 'https://maps.app.goo.gl/DK5SWkYiojBo9VZt7',
          stops: ['Tecuexcontitlán', 'Sasamulco', 'El Ahuacatito', 'Tonalapa del Río', 'Coatepec Costales', 'Tlacuitlapa'],
          triggerStops: ['Tecuexcontitlán', 'Palula', 'Venta de Palula', 'Tonalapa del Sur']
        }
      ],
      notes: 'Troncal principal Centro - Norte con acceso hacia Sasamulco y Tlacuitlapa.'
    },
    {
      id: 'corredor-chilpancingo-rio-balsas',
      name: 'Ruta Chilpancingo - Río Balsas',
      category: 'Chilpancingo / Centro',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/3auiFE1kp3s2i4UG9',
      stops: ['Ameyaltepec', 'San Juan Tetelcingo', 'San Marcos Oacatzingo', 'Analco', 'San Agustín Oapan', 'San Miguel Tecuiciapan', 'San Francisco Ozomatlán', 'Ahuetlixpa'],
      continuations: [
        {
          name: 'Continuidad Ahuetlixpa - Totolcintla',
          mapsUrl: 'https://maps.app.goo.gl/n2EYZDJLgGJUWsHk7',
          stops: ['Ahuetlixpa', 'Tula del Río', 'San Agustín Ostotipan', 'San Juan Totolcintla'],
          triggerStops: ['Ahuetlixpa', 'San Francisco Ozomatlán', 'San Miguel Tecuiciapan']
        }
      ],
      notes: 'Cuenca del Río Balsas. Pueblos ribereños con continuidad hacia Totolcintla.'
    },
    {
      id: 'corredor-iguala-cacahuamilpa',
      name: 'Ruta Iguala - Cacahuamilpa',
      category: 'Iguala / Norte',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/pt4pNh4tUbaSjqmx6',
      stops: ['Coxcatlán', 'Tlamacazapa', 'Crucero de Grutas', 'Cacahuamilpa'],
      continuations: [],
      notes: 'Corredor Norte rumbo a Taxco y límite con Estado de México.'
    },
    {
      id: 'corredor-iguala-xochimilco',
      name: 'Ruta Iguala - Xochimilco',
      category: 'Iguala / Norte',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/kdNZ69wAg3s7KMtc8',
      stops: ['Tetelilla', 'Santa Cruz', 'El Rincón', 'Xilocintla', 'Cacahuananche', 'Texahualco', 'Tlapala', 'Tecolotla', 'Xochimilco'],
      continuations: [
        {
          name: 'Continuidad Atetetla - Nanche Dulce',
          mapsUrl: 'https://maps.app.goo.gl/CAeeJpfNkTGgY8GU9',
          stops: ['Atetetla', 'Xoyacuautla', 'Lagunillas', 'Nanche Dulce'],
          triggerStops: ['Xochimilco', 'Tecolotla', 'Tetelilla']
        }
      ],
      notes: 'Ruta de sitios y nodos en la zona norte con derivación a Atetetla y Lagunillas.'
    },
    {
      id: 'corredor-iguala-san-juan-teocalcingo',
      name: 'Ruta Iguala - San Juan Teocalcingo',
      category: 'Iguala / Norte',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/NaezRHWxNeiHUnrZ7',
      stops: ['Atopula', 'Escuchapa', 'Chaucingo', 'Cuahuilotla', 'San Juan Teocalcingo'],
      continuations: [],
      notes: 'Corredor agropecuario y de enlaces inalámbricos de la región Norte.'
    },
    {
      id: 'corredor-chilpancingo-huaxtla',
      name: 'Ruta Chilpancingo - Huaxtla (Morelos)',
      category: 'Morelos y Puebla',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/t48YnJ8yUf4p9tgN7',
      stops: ['Las Bóvedas', 'La Mezquitera', 'La Era', 'Los Elotes', 'Valle de Vázquez', 'Chimalacatlán', 'Quilamula', 'Xochipala', 'Huaxtla'],
      continuations: [
        {
          name: 'Continuidad Huaxtla - San José de Pala',
          mapsUrl: 'https://maps.app.goo.gl/jSttRAfSXBCf7ypVA',
          stops: ['Huaxtla', 'Ajuchitlán', 'Xantiopan', 'San José de Pala'],
          triggerStops: ['Huaxtla', 'Quilamula', 'Chimalacatlán']
        }
      ],
      notes: 'Enlace fronterizo Guerrero - Morelos a través de la sierra de Huautla.'
    },
    {
      id: 'corredor-chilpancingo-alta-vista-copalillo',
      name: 'Ruta Chilpancingo - Alta Vista Copalillo / Tlayahualco',
      category: 'Chilpancingo / Norte',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/NpPHx73d8BoZFqRU7',
      stops: ['Acaquila', 'Tequicuilco', 'San Miguel de las Palmas', 'Tepetlapa', 'El Cascalote', 'Comala de Gómez', 'Santiago Zacango', 'Tlayahualco', 'Alta Vista'],
      continuations: [
        {
          name: 'Continuidad Zicapa - Papalutla',
          mapsUrl: 'https://maps.app.goo.gl/TQtZabuUMx5S8dpo6',
          stops: ['Zicapa', 'San Francisco', 'San Miguel', 'Mezquitlan', 'Papalutla'],
          triggerStops: ['Tlayahualco', 'Alta Vista', 'Comala de Gómez']
        }
      ],
      notes: 'Zona de Copalillo y límite con Atenango del Río.'
    },
    {
      id: 'corredor-chilpancingo-puebla-maravillas',
      name: 'Ruta Chilpancingo - Puebla Las Maravillas',
      category: 'Morelos y Puebla',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/vNaLxjZeckMd6juKA',
      stops: ['San Vicente', 'Huachinantla', 'El Salado', 'Teutla', 'Jolalpan', 'Tlaucingo', 'Las Maravillas Puebla'],
      continuations: [
        {
          name: 'Continuidad Las Maravillas - San Pedro la Junta',
          mapsUrl: 'https://maps.app.goo.gl/WUe9NW5p1xkoXaF87',
          stops: ['Tepoxmatla', 'Ayoxuxtla', 'San Miguel Ejido', 'Chiauzumba', 'San Martín la Flor', 'San Manuel la Parota', 'Xaltianguis', 'San Pedro la Junta'],
          triggerStops: ['Las Maravillas Puebla', 'Tlaucingo', 'Jolalpan']
        },
        {
          name: 'Continuidad San Pedro la Junta - Las Piletas',
          mapsUrl: 'https://maps.app.goo.gl/19HcsHHrp68tveoU8',
          stops: ['San Pedro la Junta', 'Santa Cruz Tejalpa', 'El Pitayo', 'Mexquitepec', 'San Martín Toltepec', 'Las Piletas'],
          triggerStops: ['San Pedro la Junta', 'Xaltianguis']
        }
      ],
      notes: 'Corredor interestatal Guerrero - Puebla / Mixteca poblana.'
    },
    {
      id: 'corredor-chilpancingo-san-marcos',
      name: 'Ruta Chilpancingo - San Marcos',
      category: 'San Marcos / Costa Chica',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/WSpthDKpa6SqNCcP8',
      stops: ['Las Piñas', 'Tlalchocohuite', 'Amatepec', 'Huajintepec', 'Agua Zarca de la Peña', 'Piedra Blanca', 'Rancho Nuevo'],
      continuations: [
        {
          name: 'Continuidad Rancho Nuevo - Santa Elena de la Villa',
          mapsUrl: 'https://maps.app.goo.gl/qCoxS2dzC6Nq8DMU7',
          stops: ['El Guayabo', 'Las Cruces', 'Llano Grande', 'El Techale', 'Colonia Anáhuac', 'Anáhuac', 'El Cuco', 'Santa Elena', 'Santa Elena de la Villa'],
          triggerStops: ['Rancho Nuevo', 'Piedra Blanca']
        },
        {
          name: 'Continuidad Amatal - Moctezuma',
          mapsUrl: 'https://maps.app.goo.gl/6rDo7yuTY8T2anZG7',
          stops: ['El Amatal', 'Rancho Viejo', 'Moctezuma'],
          triggerStops: ['Santa Elena de la Villa', 'Santa Elena']
        }
      ],
      notes: 'Descenso de la Sierra hacia la Costa Chica conectando comunidades de San Marcos.'
    },
    {
      id: 'corredor-chilpancingo-rancho-palomo',
      name: 'Ruta Chilpancingo - Rancho El Palomo',
      category: 'Chilpancingo / Centro',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/nm2tVNueyCZA8ktg8',
      stops: ['Tlahuizapa', 'Coacoyulillo', 'Inscuinatoyac', 'Palo Gordo', 'Carrizal de Pinzón', 'Plan de Lima', 'Xolapa', 'Ciruelar', 'El Salitre'],
      continuations: [
        {
          name: 'Continuidad Rancho El Palomo - Santa Rita',
          mapsUrl: 'https://maps.app.goo.gl/qXFohFR7MzayUPDPA',
          stops: ['Rancho el Palomo', 'Las Marías', 'La Calera', 'Santa Rosa de Lima', 'San Cristóbal', 'San Miguel', 'Santa Barbara', 'Santa Rita'],
          triggerStops: ['El Salitre', 'Ciruelar', 'Xolapa']
        }
      ],
      notes: 'Pueblos de la cuenca sur de Chilpancingo rumbo a Tierra Colorada.'
    },
    {
      id: 'corredor-chilpancingo-tabacal',
      name: 'Ruta Chilpancingo - Tabacal',
      category: 'Chilpancingo / Sierra',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/Sn9udx4FiyyFGixt6',
      stops: ['Michapa', 'Rancho Viejo', 'Chautipa', 'Perseverancia', 'La Estrella', 'Tlayolapa', 'El Terrero', 'El Tabacal'],
      continuations: [
        {
          name: 'Continuidad Tabacal - San Francisco',
          mapsUrl: 'https://maps.app.goo.gl/CkQwt8PbfX7324en6',
          stops: ['El Tabacal', 'San Martín', 'Ochoapa', 'Los Magueyitos', 'El Charco', 'San Francisco'],
          triggerStops: ['El Tabacal', 'El Terrero', 'Tlayolapa']
        }
      ],
      notes: 'Sierra central de Chilpancingo y Leonardo Bravo.'
    },
    {
      id: 'corredor-chilpancingo-el-durazno',
      name: 'Ruta Chilpancingo - El Durazno',
      category: 'Chilpancingo / Sierra',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/9BNSo3DcJTLLWNso8',
      stops: ['Aixcualco', 'Ahuexotitlán', 'Almolonga', 'Zoquiapa', 'El Durazno'],
      continuations: [],
      notes: 'Zona oriente de Chilpancingo hacia Tixtla y El Durazno.'
    },
    {
      id: 'corredor-chilpancingo-san-roque',
      name: 'Ruta Chilpancingo - San Roque',
      category: 'Chilpancingo / Centro',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/3YDVYuU97wJpp7A38',
      stops: ['Chacotla', 'Lagunilla', 'El Salado', 'El Tejocote', 'Acahuizotla', 'San Roque'],
      continuations: [],
      notes: 'Corredor carretera libre hacia Acahuizotla y cañón del Zopilote sur.'
    },
    {
      id: 'corredor-chilpancingo-ocotillo',
      name: 'Ruta Chilpancingo - Ocotillo',
      category: 'Chilpancingo / Centro',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/kkscGaPRDSL76dTZA',
      stops: ['El Zapote', 'El Pelillo', 'Loma Larga', 'Tecomapa', 'El Papayito', 'San Juan del Río', 'Agua Zarca', 'Ocotillo'],
      continuations: [],
      notes: 'Comunidades rurales hacia el sur del municipio.'
    },
    {
      id: 'corredor-ayutla-tejoruco',
      name: 'Ruta Ayutla - Tejoruco',
      category: 'Ayutla / Costa Chica',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/3sDa3AMENY1B1kZm6',
      stops: ['El Tejoruco', 'Parota Seca', 'El Tecorral', 'El Potrero', 'Los Sauces', 'Ayutla Regreso'],
      continuations: [],
      notes: 'Circuito de comunidades altas de Ayutla de los Libres.'
    },
    {
      id: 'corredor-ayutla-tierra-blanca',
      name: 'Ruta Ayutla - Tierra Blanca',
      category: 'Ayutla / Costa Chica',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/VTGhsHypKmtRey8C9',
      stops: ['Cuadrilla Nueva', 'Acalmani', 'Cerro Pelón', 'Rio Azul', 'Plan de Gatica', 'Escalerilla', 'Tierra Blanca'],
      continuations: [
        {
          name: 'Continuidad Tierra Blanca - Tecruz',
          mapsUrl: 'https://maps.app.goo.gl/QqKsba78VjiswbPcA',
          stops: ['San Juan De Los Pinos', 'El Aguacate', 'Río Grande', 'Tecruz'],
          triggerStops: ['Tierra Blanca', 'Escalerilla']
        }
      ],
      notes: 'Camino hacia Tierra Blanca y Río Grande.'
    },
    {
      id: 'corredor-ayutla-caxitepec',
      name: 'Ruta Ayutla - Caxitepec',
      category: 'Ayutla / Costa Chica',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/2KJVHsiXSJQCWnNu5',
      stops: ['Puma Rosa', 'Colonia Progreso', 'La Unificada', 'Barranca de Guadalupe', 'Filo de Caballos', 'Barranca Tecoani', 'Rio Velero', 'El Camalote', 'Caxitepec'],
      continuations: [
        {
          name: 'Continuidad Caxitepec - Yerba Santa',
          mapsUrl: 'https://maps.app.goo.gl/6yAroPJgYDEwSjNa9',
          stops: ['Alcamani', 'Llano de la Parota', 'Barranca Bejuco', 'Loma Bonita', 'Puerto Buenavista', 'San Marcos', 'Yerba Santa'],
          triggerStops: ['Caxitepec', 'El Camalote', 'Rio Velero']
        }
      ],
      notes: 'Sierra de Ayutla con bajada hacia la costa por Yerba Santa.'
    },
    {
      id: 'corredor-ayutla-juquilita',
      name: 'Ruta Ayutla - Juquilita',
      category: 'Ayutla / Costa Chica',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/BLjnY9rksDS2tkm56',
      stops: ['Mexcaltepec', 'Mezcalapa', 'Metlapilapa', 'Villa Guadalupe', 'Xochistlahuaca', 'El Mango 39200', 'Totomixtlahuaca', 'San Miguelito', 'Juquila'],
      continuations: [
        {
          name: 'Continuidad Juquilita - Ahuejuyo Viejo',
          mapsUrl: 'https://maps.app.goo.gl/dVp4iDxzLJAwC9z16',
          stops: ['Tenamazapa', 'Plan jacarandas', 'El Mirador', 'Crucero de Tlacotepec', 'Ahuejuyo viejo'],
          triggerStops: ['Juquila', 'San Miguelito', 'Totomixtlahuaca']
        }
      ],
      notes: 'Ruta indígena Me’phaa y Na Savi de la montaña de Ayutla.'
    },
    {
      id: 'corredor-ayutla-coacoyulichan',
      name: 'Ruta Ayutla - Coacoyulichán',
      category: 'Ayutla / Costa Chica',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/PwkkJjWLP5NH4uKNA',
      stops: ['Pozolapa', 'El Zapote', 'La Unión', 'El Guineo', 'Tlachimala', 'La Azozuca', 'La Lima', 'Coacoyulichán', 'El Llano'],
      continuations: [
        {
          name: 'Continuidad Coacoyulichán - San Agustín Cuilutla',
          mapsUrl: 'https://maps.app.goo.gl/uTVENrWV6wfnYvu17',
          stops: ['Paso Salinas', 'El Coquillo', 'San Agustín Cuilutla'],
          triggerStops: ['Coacoyulichán', 'El Llano', 'La Lima']
        }
      ],
      notes: 'Comunidades del valle de Ayutla hacia Cuautepec.'
    },
    {
      id: 'corredor-ayutla-san-jose-capulin',
      name: 'Ruta Ayutla - San José Capulín',
      category: 'Ayutla / Costa Chica',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/HJDYMTabFz9Vfbkh6',
      stops: ['Los Achotes', 'Cruz Verde', 'Poza Verde', 'El Capulín Chocolate', 'San José el Capulin'],
      continuations: [],
      notes: 'Comunidades de la zona baja de Ayutla.'
    },
    {
      id: 'corredor-ayutla-pascala-del-oro',
      name: 'Ruta Ayutla - Pascala del Oro',
      category: 'Ayutla / Costa Chica',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/7GCE4jheoUSP8BpKA',
      stops: ['Tres Cruces', 'Arroyo Mixtecolapa', 'El Cocoyul', 'Colonia Hidalgo', 'Colonia Santa Cruz el Mesón', 'Pascala del Oro'],
      continuations: [],
      notes: 'Camino montañoso hacia Pascala del Oro.'
    },
    {
      id: 'corredor-san-marcos-apanhuac',
      name: 'Ruta San Marcos - Apanhuac',
      category: 'San Marcos / Costa Chica',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/mQTgqgoQY9vfDQ3s9',
      stops: ['El Cocoyult', 'El Cortés', 'Bella Vista', 'Tecomate Nanchal', 'El Tamarindo', 'Yucatán de las Flores', 'Barrio Nuevo de los Muertos', 'Huamuchitos', 'Apanhuac'],
      continuations: [
        {
          name: 'Continuidad Apanhuac - San Juan Grande',
          mapsUrl: 'https://maps.app.goo.gl/xJVTUSzit1Uspe2c8',
          stops: ['Espinalillo', 'El Cantón', 'Cacahuatepec', 'Apalani', 'Campanario', 'Colonia Progreso Las Minas', 'Las Minas', 'San Juan Chico', 'San Juan Grande'],
          triggerStops: ['Apanhuac', 'Huamuchitos']
        }
      ],
      notes: 'Ribera de los ríos Papagayo y Nexpa en el municipio de San Marcos.'
    },
    {
      id: 'corredor-san-marcos-espinalillo',
      name: 'Ruta San Marcos - Espinalillo',
      category: 'San Marcos / Costa Chica',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/LRSweyFCBT4JMDpc9',
      stops: ['Vista Hermosa', 'Tecomate Pesqueria', 'Cerro del Toro Pando', 'El Cerro Pesquería', 'Espinalillo', 'Barranca Prieta', 'Alto de Ventura', 'Estero Verde', 'Cuatro Bancos'],
      continuations: [
        {
          name: 'Continuidad Espinalillo - El Porvenir',
          mapsUrl: 'https://maps.app.goo.gl/rqLSnUFsgsqMgfMq8',
          stops: ['Playa Larga', 'Vista Alegre', 'El Papayo', 'Arroyo Limón', 'Las Lomitas de Nexpa', 'La Colonia de Río Nexpa', 'Carabalincito', 'Carabalí Grande', 'El Porvenir'],
          triggerStops: ['Espinalillo', 'Barranca Prieta', 'Cuatro Bancos']
        },
        {
          name: 'Continuidad El Porvenir - El Carrizo',
          mapsUrl: 'https://maps.app.goo.gl/rqLSnUFsgsqMgfMq8',
          stops: ['Charco del Pozo', 'Los Tamarindos', 'San Antonio', 'El Pabellón', 'El Salto', 'Las Peñas', 'El Carrizo'],
          triggerStops: ['El Porvenir', 'Carabalí Grande']
        }
      ],
      notes: 'Litoral costero y lagunas de San Marcos y Florencio Villarreal.'
    },
    {
      id: 'corredor-ometepec-llano-grande',
      name: 'Ruta Ometepec - Llano Grande',
      category: 'San Marcos / Ometepec',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/UCCcNzGh7E8M9yrW8',
      stops: ['Piedra Boluda', 'Las Iguanas', 'Charco de la Puerta', 'Milpillas', 'Vista Hermosa', 'Comaltepec', 'Barajillas', 'Llano Grande'],
      continuations: [
        {
          name: 'Continuidad Llano Grande - Buenos Aires',
          mapsUrl: 'https://maps.app.goo.gl/7P3kQQdDy3usfxzP8',
          stops: ['La Culebra', 'El Cacalote', 'Maldonado', 'Tierra Colorada', 'Buenos Aires'],
          triggerStops: ['Llano Grande', 'Barajillas', 'Comaltepec']
        }
      ],
      notes: 'Llanura costera de Ometepec y Cuajinicuilapa hacia el límite con Oaxaca.'
    },
    {
      id: 'corredor-ometepec-tierra-blanca',
      name: 'Ruta Ometepec - Tierra Blanca',
      category: 'San Marcos / Ometepec',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/eV9hph6mvk7r1sYbA',
      stops: ['Piedra Labrada', 'La Catalina', 'Chicapilla', 'La Culebra', 'Vista Hermosa', 'Camotinchán', 'Cañada del Totomoxtle', 'Tierra Blanca'],
      continuations: [
        {
          name: 'Continuidad Tierra Blanca - La Libertad',
          mapsUrl: 'https://maps.app.goo.gl/dY84HMrfpWmMGHsR7',
          stops: ['Piedra Ancha', 'El Tamarindo', 'La Libertad'],
          triggerStops: ['Tierra Blanca', 'Cañada del Totomoxtle']
        }
      ],
      notes: 'Zona afromexicana y serranía de Ometepec.'
    },
    {
      id: 'corredor-coyuca-la-remontita',
      name: 'Ruta Coyuca - La Remontita',
      category: 'Acapulco / Coyuca',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/KEGvf6FAjEB6k5Qw6',
      stops: ['Encino Prieto', 'Paso Real', 'Atoyaquillo', 'Las Pulgas', 'Barrio Nuevo la Laja', 'Yerbasanta', 'Las Compuertas', 'Barrio Nuevo del Progreso', 'San Isidro'],
      continuations: [
        {
          name: 'Continuidad La Remontita - El Huamúchil',
          mapsUrl: 'https://maps.app.goo.gl/rhDHKUtLPAosmUsh9',
          stops: ['La Remontita', 'La Felicidad de Rosales', 'Colonia del Rio', 'El Terrero', 'Los Nopales', 'Huertecillas', 'El Huamúchil'],
          triggerStops: ['San Isidro', 'Barrio Nuevo del Progreso']
        }
      ],
      notes: 'Sierra de Coyuca de Benítez en la Costa Grande.'
    },
    {
      id: 'corredor-acapulco-lomas-del-aire',
      name: 'Ruta Acapulco - Lomas del Aire',
      category: 'Acapulco / Coyuca',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/PnALUiVNuZq5oKiX7',
      stops: ['Parotillas', 'Los Ilamos', 'Rancho las Marías', 'Las Parotas', 'Garrapatas', 'San José Cacahuatepec', 'Las Ollitas', 'El Veladero', 'Lomas del Aire'],
      continuations: [
        {
          name: 'Continuidad Lomas del Aire - Agua del Perro',
          mapsUrl: 'https://maps.app.goo.gl/DN9XAtXJ9V732fvL8',
          stops: ['Los Huajes', 'Alto del Camarón', 'Agua del Perro'],
          triggerStops: ['Lomas del Aire', 'El Veladero']
        }
      ],
      notes: 'Zona rural norte y noroeste del municipio de Acapulco.'
    },

    // ---------------------------------------------------------
    // RUTAS ANEXADAS DIRECTAS DESDE CHILPANCINGO
    // ---------------------------------------------------------
    {
      id: 'anexada-chilpancingo-balzamar',
      name: 'Ruta Anexada Chilpancingo - Balzamar',
      category: 'Chilpancingo / Centro',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/bjsNw7dzDZeWRxv96',
      stops: ['Chilpancingo', 'Nuevo Balzamar', 'Balzamar'],
      continuations: [],
      notes: 'Ruta directa anexada hacia Balzamar.'
    },
    {
      id: 'anexada-chilpancingo-papalotepec',
      name: 'Ruta Anexada Chilpancingo - Papalotepec',
      category: 'Chilpancingo / Centro',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/4L8gKm7JjXE3dWXx8',
      stops: ['Chilpancingo', 'Papalotepec'],
      continuations: [],
      notes: 'Ruta directa hacia Papalotepec.'
    },
    {
      id: 'anexada-chilpancingo-ahuelican',
      name: 'Ruta Anexada Chilpancingo - Ahuelicán',
      category: 'Chilpancingo / Centro',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/CoFdLRT5fa9K6Lk98',
      stops: ['Chilpancingo', 'Ahuelicán'],
      continuations: [],
      notes: 'Ruta directa hacia Ahuelicán (Eduardo Neri).'
    },
    {
      id: 'anexada-chilpancingo-ahuehuepan',
      name: 'Ruta Anexada Chilpancingo - Ahuehuepan',
      category: 'Chilpancingo / Centro',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/6AVZrTkpA1WjKnJUA',
      stops: ['Chilpancingo', 'Ahuehuepan'],
      continuations: [],
      notes: 'Ruta directa hacia Ahuehuepan.'
    },
    {
      id: 'anexada-chilpancingo-axaxacualco',
      name: 'Ruta Anexada Chilpancingo - Axaxacualco y Tlanipatla',
      category: 'Chilpancingo / Centro',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/XBxtSVnBzAphRwPa8',
      stops: ['Chilpancingo', 'Axaxacualco', 'Tlanipatla'],
      continuations: [],
      notes: 'Comunidades al norte de Chilpancingo.'
    },
    {
      id: 'anexada-chilpancingo-la-laguna',
      name: 'Ruta Anexada Chilpancingo - La Laguna',
      category: 'Chilpancingo / Centro',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/WGvZbipVR9QheKrH8',
      stops: ['Chilpancingo', 'La Laguna'],
      continuations: [],
      notes: 'Comunidad La Laguna.'
    },
    {
      id: 'anexada-chilpancingo-amojileca',
      name: 'Ruta Anexada Chilpancingo - Amojileca',
      category: 'Chilpancingo / Centro',
      type: 'corredor',
      mapsUrl: 'https://maps.app.goo.gl/ki799ySSzFnW3BzH9',
      stops: ['Chilpancingo', 'Amojileca'],
      continuations: [],
      notes: 'Sierra poniente de Chilpancingo.'
    },

    // ---------------------------------------------------------
    // TABLAS DE RECORRIDOS SECUENCIALES (1..N)
    // ---------------------------------------------------------
    {
      id: 'recorrido-tlayolapa',
      name: 'Recorrido Tlayolapa',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/Sn9udx4FiyyFGixt6',
      stops: [
        'Villa Guerrero', 'Tlayolapa', 'El Terrero', 'El Tabacal', 'San Martín',
        'Ochuapa', 'Magueyitos', 'El Charco', 'San Francisco', 'La Estrella',
        'Perseverancia', 'Chautipa', 'Rancho Viejo', 'Michapa'
      ],
      continuations: [],
      notes: 'Recorrido secuencial de 14 pueblos en la sierra de Tlayolapa.'
    },
    {
      id: 'recorrido-los-sauces',
      name: 'Recorrido Los Sauces',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/3sDa3AMENY1B1kZm6',
      stops: [
        'Tlayoyotepec', 'Tejoruco', 'Parota Seca', 'Tecorrales', 'Cruzitas',
        'El Potrero', 'Los Sauces', 'Pozolapa', 'Azozuca', 'El Zapote',
        'Guineo', 'La Unión', 'Tlachimala', 'El Capulín'
      ],
      continuations: [],
      notes: 'Recorrido secuencial de 14 paradas de la ruta Los Sauces.'
    },
    {
      id: 'recorrido-ayutla',
      name: 'Recorrido Ayutla Completo',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/VTGhsHypKmtRey8C9',
      stops: [
        'Tamarindo', 'Cuadrilla Nueva', 'Acalmani', 'Cerro Pelón', 'Río Azul',
        'Plan de Gatica', 'Escalerilla', 'Tierra Blanca', 'San Juan de los Pinos', 'El Aguacate',
        'Río Grande', 'Te Cruz', 'Colonia Progreso', 'Puma Rosa', 'La Unificada',
        'Barranca Guadalupe', 'Colonia Filo de Caballos', 'Barranca Tecuani', 'Río Velero', 'Camalote',
        'Caxitepec', 'Barranca Bejuco', 'Alcalmani', 'Llano la Parota', 'Loma Bonita',
        'Yerba Santa'
      ],
      continuations: [],
      notes: 'Gran recorrido secuencial de 26 paradas por la zona montañosa de Ayutla.'
    },
    {
      id: 'recorrido-pascala-del-oro',
      name: 'Recorrido Pascala del Oro',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/7GCE4jheoUSP8BpKA',
      stops: [
        'Tres Cruces', 'Arroyo Mixtecolpa', 'Cocoyul', 'Colonia Hidalgo', 'Pascala del Oro',
        'Colonia Pascala del Oro', 'Metlapilapa', 'Mexcalapa', 'Villa Guadalupe', 'Xochistlahuaca',
        'El Mango', 'Totomixtlahuaca', 'Ahuejuyo', 'Juquila', 'Tenamazapa',
        'Plan de Jacarandas', 'San Miguel', 'Mexcaltepec'
      ],
      continuations: [],
      notes: 'Recorrido secuencial de 18 paradas por la zona de Pascala del Oro.'
    },
    {
      id: 'recorrido-omitlan-san-marcos',
      name: 'Recorrido Omitlán / San Marcos',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/WSpthDKpa6SqNCcP8',
      stops: [
        'Omitlán', 'Las Piñas', 'Tlalchocohuites', 'Amatepec', 'Huajintepec',
        'Agua Zarca de las Peñas', 'Las Cruces', 'Guayabo', 'Rancho Nuevo', 'Piedra Blanca',
        'Llano Grande', 'El Techale', 'Anáhuac', 'Colonia Anáhuac', 'Cuco',
        'Santa Elena', 'Santa Elena la Villa', 'El Amatal', 'Rancho Viejo', 'Moctezuma'
      ],
      continuations: [],
      notes: 'Recorrido secuencial de 20 pueblos desde Omitlán hasta Moctezuma.'
    },
    {
      id: 'recorrido-san-marcos-tecomate',
      name: 'Recorrido San Marcos / Tecomate Pesquería',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/LRSweyFCBT4JMDpc9',
      stops: [
        'Tecomate Pesquería', 'Vista Hermosa', 'Toro Pando', 'Las Playas', 'Playa Larga',
        'Barranca Prieta', 'Alto Ventura', 'Estero Verde', 'Cuatro Bancos', 'Charco del Pozo',
        'El Tamarindo', 'El Porvenir', 'Lomitas de Nexpa', 'Carabalincito', 'Carabalí',
        'Río Nexpa', 'Vista Alegre', 'El Papayo', 'Arroyo Limón'
      ],
      continuations: [],
      notes: 'Recorrido costero secuencial de 19 paradas por lagunas y playas.'
    },
    {
      id: 'recorrido-el-cortes-cocoyul',
      name: 'Recorrido El Cortés / Cocoyul / Campanario',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/mQTgqgoQY9vfDQ3s9',
      stops: [
        'El Cortés', 'Cocoyul', 'Bella Vista', 'Tecomate Nanchal', 'Tamarindo',
        'Yucatán de las Flores', 'Barrio de los Muertos', 'El Cerrito', 'Huamuchitos', 'Apanhuac',
        'Espinalillo', 'El Cantón', 'Cacahuatepec', 'El Carrizo', 'Apalani',
        'Campanario', 'Las Minas', 'San Juan el Chico', 'San Juan el Grande'
      ],
      continuations: [],
      notes: 'Recorrido secuencial de 19 comunidades rurales del río Papagayo.'
    },
    {
      id: 'recorrido-las-ollitas-veladero',
      name: 'Recorrido Las Ollitas / Veladero / Lomas del Aire',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/PnALUiVNuZq5oKiX7',
      stops: [
        'Las Ollitas', 'San José Cacahuatepec', 'Garrapatas', 'Parotillas', 'Los Ilamos',
        'Rancho las Marías', 'Las Parotas', 'Veladero', 'Lomas del Aire', 'Los Huajes',
        'Alto del Camarón', 'Agua de Perro'
      ],
      continuations: [],
      notes: 'Recorrido secuencial de 12 sitios de la cuenca alta de Acapulco.'
    },
    {
      id: 'recorrido-pueblos-santos',
      name: 'Recorrido Pueblos Santos',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/qXFohFR7MzayUPDPA',
      stops: [
        'Tlahuizapa', 'Coacoyulillo', 'Inscuinatoyac', 'El Carrizo', 'Santa Rosa',
        'San Miguel', 'San Cristóbal', 'Santa Bárbara', 'Santa Rita', 'Las Marías',
        'La Calera', 'Ocotillo', 'El Zapote', 'Tecomapa', 'Pelillo',
        'Playa Larga', 'Papayito', 'San Juan del Río', 'Agua Zarca'
      ],
      continuations: [],
      notes: 'Recorrido secuencial de 19 paradas en comunidades hermanadas de la zona sur.'
    },
    {
      id: 'recorrido-acapulco-san-roque',
      name: 'Recorrido Acapulco / San Roque / Salitre',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/3YDVYuU97wJpp7A38',
      stops: [
        'Chacotla', 'El Salado', 'Acahuizotla', 'San Roque', 'Palo Gordo',
        'Xolapa', 'Salitre', 'Ciruelar', 'Paraje de la Zorra'
      ],
      continuations: [],
      notes: 'Recorrido secuencial de 9 paradas hacia la zona de Acahuizotla y Xolapa.'
    },
    {
      id: 'recorrido-iguala-tetelilla-xochimilco',
      name: 'Recorrido Iguala / Tetelilla / Xochimilco',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/kdNZ69wAg3s7KMtc8',
      stops: [
        'Tetelilla', 'Santa Cruz', 'Rincón Chiquito', 'Xilocintla', 'Cacahuananche',
        'Texahualco', 'Tlapala', 'Tecolotla', 'Xochimilco', 'Atetetla',
        'Xoyacuautla', 'Lagunillas', 'Nanche Dulce', 'Atopula', 'Escuchapa',
        'Chaucingo', 'Coahuilotla', 'San Juan Teocalcingo'
      ],
      continuations: [],
      notes: 'Gran circuito secuencial de 18 sitios del valle de Iguala y Tepecoacuilco.'
    },
    {
      id: 'recorrido-iguala-cacahuamilpa-sasamulco',
      name: 'Recorrido Iguala / Cacahuamilpa / Sasamulco',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/DK5SWkYiojBo9VZt7',
      stops: [
        'Casa de Colores', 'El Palmar', 'Xochipala', 'Venta Vieja', 'Tlamamacan',
        'San Marcos', 'San Agustín', 'San Juan', 'Ameyaltepec', 'Ahuelicán',
        'Ahuehuepan', 'Xalitla', 'Maxela', 'Tonalapa del Sur', 'Palula',
        'Venta de Palula', 'Tecuexcontitlán', 'Sasamulco', 'Grutas de Cacahuamilpa', 'Crucero las Grutas',
        'Coxcatlán', 'Tlamacazapa', 'Tonalapa del Río', 'Coatepec Costales', 'Tlacuitlapa',
        'Aguacatito'
      ],
      continuations: [],
      notes: 'Circuito amplio secuencial de 26 paradas por la zona Norte y límite del estado.'
    },
    {
      id: 'recorrido-morelos-y-puebla',
      name: 'Recorrido Morelos y Puebla',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/vNaLxjZeckMd6juKA',
      stops: [
        'Las Bóvedas', 'La Mezquitera', 'La Era', 'Los Elotes', 'Valle de Vázquez',
        'Chimalacatlán', 'Aquilamula', 'Xochipala', 'Santiopan', 'Ajuchitlán',
        'San José de Pala', 'Tepoxmatla', 'Ayoxuxtla', 'San Miguel Ejido', 'Chiauzumba',
        'San Martín la Flor', 'La Parota', 'Xaltianguis', 'San Pedro la Junta', 'Santa Cruz Tejalpa',
        'El Pitayo', 'Mexquitepec', 'San José Hidalgo', 'Maravillas', 'Tlaucingo',
        'Jolalpan', 'Teutla', 'El Salado', 'Huachinantla', 'San Vicente'
      ],
      continuations: [],
      notes: 'Gran corredor secuencial interestatal de 30 pueblos entre Guerrero, Morelos y Puebla.'
    },
    {
      id: 'recorrido-papalutla',
      name: 'Recorrido Papalutla / Copalillo',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/TQtZabuUMx5S8dpo6',
      stops: [
        'Mezquitlan', 'Papalutla', 'San Miguel Mezquitepec', 'San Francisco Otzutla', 'Zicapa',
        'Huaxtitlán', 'Tlayahualco', 'Cascalote', 'Santiago Zacango', 'Comala',
        'San Miguel de las Palmas', 'Tepetlapa', 'Tequicuilco', 'Acaquila', 'San Francisco Ozomatlán',
        'Tula del Río', 'San Agustín Ostotipan', 'San Juan Totolcintla'
      ],
      continuations: [],
      notes: 'Circuito secuencial de 18 sitios en Atenango del Río y Copalillo.'
    },
    {
      id: 'recorrido-san-agustin-cuilutla',
      name: 'Recorrido San Agustín Cuilutla',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/uTVENrWV6wfnYvu17',
      stops: [
        'La Lima', 'Coacoyulichán', 'Poza Verde', 'San Agustín Cuilutla', 'Coquillo',
        'El Llano', 'Paso Salinas', 'El Carrizo', 'Atlixco', 'Rancho Miramar',
        'Zihuapoloya', 'Los Achotes', 'Cruz Verde', 'Capulín Chocolate', 'San José Capulín'
      ],
      continuations: [],
      notes: 'Circuito secuencial de 15 comunidades de la llanura de San Agustín Cuilutla.'
    },
    {
      id: 'recorrido-ometepec-completo',
      name: 'Recorrido Ometepec / Cuajinicuilapa',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/UCCcNzGh7E8M9yrW8',
      stops: [
        'Vista Hermosa (1)', 'Vista Hermosa', 'Milpillas', 'Comaltepec', 'Charco de la Puerta',
        'Las Iguanas', 'Piedra Boluda', 'Piedra Labrada', 'La Guadalupe', 'La Catalina',
        'Chicapilla', 'La Culebra', 'Vista Hermosa (2)', 'Cañada del Totomoxtle', 'Camotinchán',
        'Tierra Blanca', 'Piedra Ancha', 'Tamarindo la Libertad', 'El Terrero', 'Barajillas',
        'Llano Grande', 'La Culebra', 'Tecoyame', 'Punta Maldonado (El Faro)', 'El Cacalote',
        'Maldonado', 'Tierra Colorada', 'Buenos Aires'
      ],
      continuations: [],
      notes: 'Ruta completa de 28 paradas en la Costa Chica hasta Punta Maldonado (El Faro).'
    },
    {
      id: 'recorrido-coyuca-completo',
      name: 'Recorrido Coyuca de Benítez',
      category: 'Recorridos 1..N',
      type: 'recorrido',
      mapsUrl: 'https://maps.app.goo.gl/KEGvf6FAjEB6k5Qw6',
      stops: [
        'Encino Prieto', 'Paso Real', 'Atoyaquillo', 'Las Pulgas', 'Barrio la Laja',
        'Hierba Santa', 'Compuertas', 'Barrio Nuevo Progreso', 'San Isidro', 'La Remontita',
        'La Felicidad de los Rosales', 'Los Huajes', 'El Porvenir', 'Las Lomitas', 'El Terrero',
        'Nopales', 'Huertecillas', 'El Huamúchil'
      ],
      continuations: [],
      notes: 'Circuito integral de 18 paradas en la sierra baja y ribera de Coyuca.'
    }
  ];

  // Exponer datos y métodos globalmente
  root.PRESET_ROUTES_DATA = PRESET_ROUTES;

  /**
   * Normaliza texto para comparaciones geográficas
   */
  function normalizeGeoText(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();
  }

  /**
   * Determina si el usuario actual tiene permisos para crear o editar rutas recomendadas
   * Exclusivo para administradores y soporte
   */
  function canManagePresetRoutes() {
    return typeof userHasRole === 'function' && userHasRole('administrador', 'admin', 'soporte');
  }
  root.canManagePresetRoutes = canManagePresetRoutes;

  const CUSTOM_PRESET_ROUTES_KEY = 'rutas_custom_preset_routes_v1';

  function getCustomPresetRoutes() {
    const SHARED_ID = typeof SHARED_PLAN_ID !== 'undefined' ? SHARED_PLAN_ID : '__shared_plan__';
    const sharedPlan = root.state?.weekPlan?.[SHARED_ID];
    if (sharedPlan && Array.isArray(sharedPlan._customPresetRoutes)) {
      return sharedPlan._customPresetRoutes;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(CUSTOM_PRESET_ROUTES_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
    }
    return [];
  }
  root.getCustomPresetRoutes = getCustomPresetRoutes;

  function saveCustomPresetRoutes(customRoutes) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(CUSTOM_PRESET_ROUTES_KEY, JSON.stringify(customRoutes));
      } catch (e) {}
    }
    const SHARED_ID = typeof SHARED_PLAN_ID !== 'undefined' ? SHARED_PLAN_ID : '__shared_plan__';
    if (!root.state) root.state = {};
    if (!root.state.weekPlan) root.state.weekPlan = {};
    if (!root.state.weekPlan[SHARED_ID]) root.state.weekPlan[SHARED_ID] = { _generalPlans: [] };
    root.state.weekPlan[SHARED_ID]._customPresetRoutes = customRoutes;
    if (typeof saveDB === 'function') {
      saveDB();
    }
  }
  root.saveCustomPresetRoutes = saveCustomPresetRoutes;

  /**
   * Retorna todas las rutas recomendadas combinando las base con las personalizadas/editadas
   */
  root.getAllPresetRoutes = function () {
    const custom = getCustomPresetRoutes();
    const map = new Map();
    // 1. Rutas base
    PRESET_ROUTES.forEach(r => map.set(r.id, { ...r }));
    // 2. Rutas personalizadas o editadas (sobreescriben o agregan)
    custom.forEach(c => map.set(c.id, { ...c }));
    return Array.from(map.values());
  };

  /**
   * Obtiene lista filtrada de rutas
   */
  root.getPresetRoutes = function (categoryFilter = 'all', query = '') {
    const qNorm = normalizeGeoText(query);
    const allRoutes = root.getAllPresetRoutes();
    return allRoutes.filter(route => {
      if (categoryFilter !== 'all' && route.category !== categoryFilter) {
        return false;
      }
      if (!qNorm) return true;

      const nameNorm = normalizeGeoText(route.name);
      const catNorm = normalizeGeoText(route.category);
      const stopsNorm = route.stops.map(s => normalizeGeoText(s)).join(' ');
      const contNorm = (route.continuations || []).map(c => normalizeGeoText(c.name) + ' ' + c.stops.map(s => normalizeGeoText(s)).join(' ')).join(' ');

      return nameNorm.includes(qNorm) || catNorm.includes(qNorm) || stopsNorm.includes(qNorm) || contNorm.includes(qNorm);
    });
  };

  const appliedContinuities = new Set();
  root.appliedContinuities = appliedContinuities;

  /**
   * Busca si una parada o lista de paradas tiene continuidades recomendadas
   */
  root.findContinuityRecommendations = function (existingStopNames = []) {
    if (!existingStopNames || !existingStopNames.length) return [];
    const normExisting = existingStopNames.map(name => normalizeGeoText(name)).filter(Boolean);

    const matches = [];
    root.getAllPresetRoutes().forEach(route => {
      (route.continuations || []).forEach(cont => {
        if (appliedContinuities.has(cont.name)) return;
        const triggers = cont.triggerStops && cont.triggerStops.length ? cont.triggerStops : route.stops;
        const hasTrigger = triggers.some(t => {
          const tNorm = normalizeGeoText(t);
          return normExisting.some(ex => ex.includes(tNorm) || tNorm.includes(ex));
        });

        if (hasTrigger) {
          // Verificar si las paradas de la continuidad ya están en el plan
          const missingStops = cont.stops.filter(cs => {
            const csNorm = normalizeGeoText(cs);
            return !normExisting.some(ex => ex.includes(csNorm) || csNorm.includes(ex));
          });

          if (missingStops.length > 0) {
            matches.push({
              parentRoute: route.name,
              name: cont.name,
              mapsUrl: cont.mapsUrl,
              stops: cont.stops,
              missingStops: missingStops
            });
          }
        }
      });
    });

    return matches;
  };

  /**
   * Busca equipos o nodos en el state actual para vincular coordenadas
   */
  function findSystemLocationMatch(stopName) {
    const targetNorm = normalizeGeoText(stopName);
    if (!targetNorm) return null;

    // 1. Buscar en antenas/torres registradas
    const equipmentList = Array.isArray(root.state?.equipment) ? root.state.equipment : [];
    for (const eq of equipmentList) {
      if (eq.deletedAt) continue;
      const eqNorm = normalizeGeoText(eq.name);
      if (eqNorm.includes(targetNorm) || targetNorm.includes(eqNorm)) {
        return {
          type: 'equipment',
          equipmentId: eq.id,
          name: eq.name,
          lat: Number(eq.lat),
          lng: Number(eq.lng),
          region: eq.region || ''
        };
      }
    }

    // 2. Buscar en pueblos/nodos registrados
    const nodesList = Array.isArray(root.state?.nodes) ? root.state.nodes : [];
    for (const node of nodesList) {
      if (node.deletedAt) continue;
      const nodeNorm = normalizeGeoText(node.name || node.n);
      if (nodeNorm.includes(targetNorm) || targetNorm.includes(nodeNorm)) {
        return {
          type: 'node',
          nodeId: node.id,
          name: node.name || node.n,
          lat: Number(node.lat),
          lng: Number(node.lng),
          region: node.zone || node.region || ''
        };
      }
    }

    return null;
  }

  const stopDetailsCache = new Map();
  let stopDetailsCacheTime = 0;
  let stopDetailsCacheOrderCount = -1;

  root.clearStopDetailsCache = function () {
    stopDetailsCache.clear();
    stopDetailsCacheTime = 0;
    stopDetailsCacheOrderCount = -1;
  };

  /**
   * Obtiene los detalles registrados para una parada (antena o pueblo) y sus pueblos/antenas vinculados
   */
  root.getStopRegisteredDetails = function (stopName) {
    if (!stopName) return [];
    const stateRef = (typeof state !== 'undefined' && state) || (typeof window !== 'undefined' && window.state) || root.state || {};
    const workOrdersList = Array.isArray(stateRef.workOrders) ? stateRef.workOrders : [];
    if (!workOrdersList.length) return [];

    const targetNorm = normalizeGeoText(stopName);
    if (!targetNorm) return [];

    const now = Date.now();
    // Cache de alto rendimiento para acelerar la carga del catálogo y evitar recálculos repetitivos
    if (stopDetailsCacheOrderCount !== workOrdersList.length || (now - stopDetailsCacheTime) > 6000) {
      stopDetailsCache.clear();
      stopDetailsCacheTime = now;
      stopDetailsCacheOrderCount = workOrdersList.length;
    } else if (stopDetailsCache.has(targetNorm)) {
      return stopDetailsCache.get(targetNorm);
    }

    const equipmentList = Array.isArray(stateRef.equipment) ? stateRef.equipment : [];
    const nodesList = Array.isArray(stateRef.nodes) ? stateRef.nodes : [];

    const matchedEqIds = new Set();
    const matchedNodeIds = new Set();
    const matchedNames = new Set([targetNorm]);

    // 1. Identificar antenas o nodos directamente por nombre
    equipmentList.forEach(eq => {
      if (eq.deletedAt) return;
      const eqNorm = normalizeGeoText(eq.name);
      if (eqNorm && (eqNorm.includes(targetNorm) || targetNorm.includes(eqNorm))) {
        matchedEqIds.add(String(eq.id));
        matchedNames.add(eqNorm);
        const linked = typeof getEquipmentLinkedNodeIds === 'function'
          ? getEquipmentLinkedNodeIds(eq.id)
          : (Array.isArray(eq.linkedNodeIds) ? eq.linkedNodeIds : []);
        linked.forEach(nid => {
          matchedNodeIds.add(String(nid));
          const nObj = nodesList.find(n => String(n.id) === String(nid));
          if (nObj) matchedNames.add(normalizeGeoText(nObj.name || nObj.n));
        });
      }
    });

    nodesList.forEach(node => {
      if (node.deletedAt) return;
      const nodeNorm = normalizeGeoText(node.name || node.n);
      if (nodeNorm && (nodeNorm.includes(targetNorm) || targetNorm.includes(nodeNorm))) {
        matchedNodeIds.add(String(node.id));
        matchedNames.add(nodeNorm);
        if (node.equipmentId) matchedEqIds.add(String(node.equipmentId));
      }
    });

    // 2. Expandir vínculos bidireccionales
    if (matchedNodeIds.size > 0) {
      equipmentList.forEach(eq => {
        if (eq.deletedAt) return;
        const linked = typeof getEquipmentLinkedNodeIds === 'function'
          ? getEquipmentLinkedNodeIds(eq.id)
          : (Array.isArray(eq.linkedNodeIds) ? eq.linkedNodeIds : []);
        const linkedStrs = linked.map(String);
        for (const nid of matchedNodeIds) {
          if (linkedStrs.includes(nid)) {
            matchedEqIds.add(String(eq.id));
            matchedNames.add(normalizeGeoText(eq.name));
            break;
          }
        }
      });
    }

    if (matchedEqIds.size > 0) {
      nodesList.forEach(node => {
        if (node.deletedAt) return;
        if (node.equipmentId && matchedEqIds.has(String(node.equipmentId))) {
          matchedNodeIds.add(String(node.id));
          matchedNames.add(normalizeGeoText(node.name || node.n));
        }
      });
    }

    // 3. Filtrar detalles registrados asociados
    const matchedOrders = [];
    const seenOrderIds = new Set();

    workOrdersList.forEach(order => {
      if (!order || order.deletedAt) return;
      if (seenOrderIds.has(order.id)) return;

      let isMatch = false;

      if (order.equipmentId && matchedEqIds.has(String(order.equipmentId))) {
        isMatch = true;
      } else if (order.nodeId && matchedNodeIds.has(String(order.nodeId))) {
        isMatch = true;
      } else if (order.nodeCode && matchedNodeIds.has(String(order.nodeCode))) {
        isMatch = true;
      } else {
        const orderEqNorm = normalizeGeoText(order.equipmentName);
        const orderNodeNorm = normalizeGeoText(order.nodeName || order.town);
        const orderLocNorm = normalizeGeoText(order.detailLocation);

        if (orderEqNorm && matchedNames.has(orderEqNorm)) isMatch = true;
        else if (orderNodeNorm && matchedNames.has(orderNodeNorm)) isMatch = true;
        else if (orderLocNorm && (orderLocNorm.includes(targetNorm) || targetNorm.includes(orderLocNorm))) isMatch = true;
      }

      if (isMatch) {
        seenOrderIds.add(order.id);
        matchedOrders.push(order);
      }
    });

    stopDetailsCache.set(targetNorm, matchedOrders);
    return matchedOrders;
  };

  /**
   * Obtiene todos los detalles registrados únicos de una ruta o continuidad completa
   */
  root.getRouteTotalRegisteredDetails = function (route) {
    if (!route || !Array.isArray(route.stops)) return [];
    const seenOrderIds = new Set();
    const allOrders = [];

    route.stops.forEach(stopName => {
      const stopDetails = root.getStopRegisteredDetails(stopName);
      stopDetails.forEach(order => {
        if (!seenOrderIds.has(order.id)) {
          seenOrderIds.add(order.id);
          allOrders.push(order);
        }
      });
    });

    return allOrders;
  };

  /**
   * Construye un objeto de parada con coordenadas vinculadas a antenas o nodos
   */
  function buildStopObject(stopName, idx = 0, notesPrefix = '') {
    const match = findSystemLocationMatch(stopName);
    if (match && match.type === 'equipment') {
      return {
        id: (typeof gid === 'function' ? gid('p') : 'p_' + Date.now() + '_' + idx),
        type: 'equipment',
        equipmentId: match.equipmentId,
        linkedNodeIds: (typeof getEquipmentLinkedNodeIds === 'function' ? getEquipmentLinkedNodeIds(match.equipmentId) : []),
        includeLinkedNodeDetails: false,
        name: match.name,
        lat: match.lat,
        lng: match.lng,
        detailIds: [],
        notes: notesPrefix ? `${notesPrefix}: ${match.name}` : `Parada ${idx + 1}`,
        materialPlanned: '',
        assignedTechId: '',
        siteStatus: 'pendiente',
        createdAt: new Date().toISOString()
      };
    } else if (match && match.type === 'node') {
      return {
        id: (typeof gid === 'function' ? gid('p') : 'p_' + Date.now() + '_' + idx),
        type: 'node',
        nodeId: match.nodeId,
        name: match.name,
        lat: match.lat,
        lng: match.lng,
        region: match.region || '',
        detailIds: [],
        notes: notesPrefix ? `${notesPrefix}: ${match.name} (Pueblo registrado)` : `Parada ${idx + 1} (Pueblo registrado)`,
        materialPlanned: '',
        assignedTechId: '',
        siteStatus: 'pendiente',
        createdAt: new Date().toISOString()
      };
    } else {
      const stateRef = (typeof state !== 'undefined' && state) || (typeof window !== 'undefined' && window.state) || root.state || {};
      const newTownName = String(stopName || '').trim();
      let newNodeId = null;

      // Si es un nombre de pueblo no registrado, registrarlo automáticamente como nuevo pueblo en el catálogo de nodos
      if (newTownName && Array.isArray(stateRef.nodes)) {
        const nextCodeNum = (stateRef.nodes.length || 0) + 1;
        const autoCode = 'R' + nextCodeNum;
        const newNode = {
          id: (typeof gid === 'function' ? gid('nd') : 'nd_' + Date.now() + '_' + idx),
          nodeCode: autoCode,
          town: newTownName,
          name: newTownName,
          zone: 'general',
          lat: 17.5500 + (idx * 0.015),
          lng: -99.5000 + (idx * 0.015),
          status: 'activo',
          notes: 'Registrado automáticamente desde catálogo de rutas',
          createdAt: new Date().toISOString()
        };
        stateRef.nodes.push(newNode);
        if (typeof saveRecord === 'function') {
          saveRecord('nodes', newNode).catch(() => {});
        }
        newNodeId = newNode.id;
      }

      return {
        id: (typeof gid === 'function' ? gid('p') : 'p_' + Date.now() + '_' + idx),
        type: 'node',
        nodeId: newNodeId,
        name: newTownName || `Pueblo ${idx + 1}`,
        lat: 17.5500 + (idx * 0.015),
        lng: -99.5000 + (idx * 0.015),
        region: '',
        detailIds: [],
        notes: notesPrefix ? `${notesPrefix}: ${newTownName}` : `Parada ${idx + 1}`,
        materialPlanned: '',
        assignedTechId: '',
        siteStatus: 'pendiente',
        createdAt: new Date().toISOString()
      };
    }
  }

  /**
   * Verifica si una parada candidata ya existe en la lista de paradas por antena, pueblo o nombre
   */
  function isStopAlreadyInList(candidateStop, existingStops) {
    if (!candidateStop || !existingStops || !existingStops.length) return false;
    const candNorm = normalizeGeoText(candidateStop.name);
    const candEqId = candidateStop.equipmentId ? String(candidateStop.equipmentId).trim() : '';
    const candNodeId = candidateStop.nodeId ? String(candidateStop.nodeId).trim() : '';

    return existingStops.some(ex => {
      if (!ex) return false;
      const exEqId = ex.equipmentId ? String(ex.equipmentId).trim() : '';
      const exNodeId = ex.nodeId ? String(ex.nodeId).trim() : '';
      const exNorm = normalizeGeoText(ex.name);

      // 1. Mismo equipo / antena por ID
      if (candEqId && exEqId && candEqId === exEqId) return true;

      // 2. Mismo nodo / pueblo por ID
      if (candNodeId && exNodeId && candNodeId === exNodeId) return true;

      // 3. Comparación por nombre normalizado
      if (candNorm && exNorm) {
        if (candNorm === exNorm) return true;
        if (candEqId && (exNorm.includes(candNorm) || candNorm.includes(exNorm))) return true;
        if (exEqId && (exNorm.includes(candNorm) || candNorm.includes(exNorm))) return true;
      }
      return false;
    });
  }

  /**
   * Helper para renderizar las opciones de asignación rápida de técnicos
   */
  function renderQuickTechOptionsHtml(selectedTechIds = []) {
    const techs = (typeof state !== 'undefined' && Array.isArray(state.technicians))
      ? state.technicians.filter(t => !t.deletedAt)
      : [];

    if (!techs.length) {
      return '<span style="font-size:11.5px;color:#94a3b8;grid-column:1/-1;">Sin técnicos registrados en el sistema</span>';
    }

    return techs.map(t => {
      const isChecked = selectedTechIds.includes(t.id);
      const initials = (t.nombre || 'T').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
      return `
        <label class="preset-quick-tech-card">
          <input type="checkbox" name="preset-quick-tech" value="${escapeAttr(t.id)}" ${isChecked ? 'checked' : ''} style="margin:0;">
          <span class="preset-quick-tech-avatar">${escapeHtml(initials)}</span>
          <span class="preset-quick-tech-name" title="${escapeHtml(t.nombre)}">${escapeHtml(t.nombre)}</span>
        </label>
      `;
    }).join('');
  }

  /**
   * Adjunta una ruta del catálogo a un nuevo plan general o al plan actual
   */
  root.attachPresetRouteToPlan = async function (routeId, asNewPlan = true, confirmed = false, quickOptions = null) {
    const allRoutes = root.getAllPresetRoutes();
    const route = allRoutes.find(r => r.id === routeId) || PRESET_ROUTES.find(r => r.id === routeId);
    if (!route) {
      if (typeof notify === 'function') notify('Ruta no encontrada en el catálogo.', 'err');
      return;
    }

    if (typeof isPlanReadOnly === 'function' && isPlanReadOnly()) {
      if (typeof notify === 'function') notify('Modo de solo lectura.', 'err');
      return;
    }

    const isTech = (typeof isTechnicianPlanView === 'function' && isTechnicianPlanView()) ||
                   (typeof userHasRole === 'function' && userHasRole('tecnico'));
    if (isTech) {
      if (typeof notify === 'function') notify('Los técnicos solo pueden consultar las rutas recomendadas.', 'warn');
      return;
    }

    // Si no ha sido confirmado interactivamente y estamos en navegador, mostrar modal de confirmación con resumen y config rápida
    if (!confirmed && typeof document !== 'undefined' && document.body && typeof OM === 'function') {
      return root.showPresetRouteConfirmModal(routeId, asNewPlan);
    }

    // Si estamos en la página de rutas.html (Mis Rutas)
    if (typeof document !== 'undefined' && document.body?.classList.contains('routes-page')) {
      return attachPresetRouteToRutasPage(route);
    }

    // Mapear paradas con nombres personalizados de configuración rápida si existen
    const targetStops = route.stops.map((s, idx) => {
      if (quickOptions && Array.isArray(quickOptions.customStops)) {
        const found = quickOptions.customStops[idx];
        if (found && found.newName) return found.newName;
      }
      return s;
    });

    const builtStops = [];
    targetStops.forEach((stopName, idx) => {
      const stopObj = buildStopObject(stopName, idx, `Parada ${idx + 1} de ${route.name}`);
      // Evitar duplicados internos en la misma ruta preestablecida
      if (!isStopAlreadyInList(stopObj, builtStops)) {
        builtStops.push(stopObj);
      }
    });

    if (asNewPlan) {
      // Crear un nuevo plan con el nombre de la ruta o el nombre personalizado
      const planName = (quickOptions && quickOptions.customPlanName) ? quickOptions.customPlanName : route.name;
      const selectedTechIds = (quickOptions && Array.isArray(quickOptions.selectedTechIds)) ? quickOptions.selectedTechIds : [];
      const plan = {
        id: (typeof gid === 'function' ? gid('gp') : 'gp_' + Date.now()),
        name: planName,
        createdAt: new Date().toISOString(),
        assignedTechId: selectedTechIds[0] || '',
        assignedTechIds: selectedTechIds,
        materialSummary: '',
        mapsUrl: route.mapsUrl || '',
        stops: builtStops
      };

      if (!root.state) root.state = {};
      if (!root.state.weekPlan) root.state.weekPlan = {};
      const SHARED_ID = typeof SHARED_PLAN_ID !== 'undefined' ? SHARED_PLAN_ID : '__shared_plan__';
      if (!root.state.weekPlan[SHARED_ID]) root.state.weekPlan[SHARED_ID] = { _generalPlans: [] };
      if (!Array.isArray(root.state.weekPlan[SHARED_ID]._generalPlans)) {
        root.state.weekPlan[SHARED_ID]._generalPlans = [];
      }

      // Desasignar técnicos elegidos de cualquier otro plan general para mantener la regla de 1 plan por técnico
      if (selectedTechIds.length) {
        const assignedSet = new Set(selectedTechIds);
        root.state.weekPlan[SHARED_ID]._generalPlans.forEach(gp => {
          if (gp && gp.id !== plan.id) {
            if (Array.isArray(gp.assignedTechIds)) {
              gp.assignedTechIds = gp.assignedTechIds.filter(id => !assignedSet.has(id));
            }
            if (assignedSet.has(gp.assignedTechId)) {
              gp.assignedTechId = gp.assignedTechIds?.[0] || '';
            }
          }
        });
      }

      root.state.weekPlan[SHARED_ID]._generalPlans.push(plan);

      if (typeof selectGeneralPlan === 'function') {
        selectGeneralPlan(plan.id);
      } else {
        if (typeof selectedGeneralPlanId !== 'undefined') root.selectedGeneralPlanId = plan.id;
        if (typeof selectedTechId !== 'undefined') root.selectedTechId = SHARED_ID;
        if (typeof selectedDay !== 'undefined') root.selectedDay = 'general';

        const techSelect = document.getElementById('plan-tech');
        const daySelect = document.getElementById('plan-day');
        const generalSelect = document.getElementById('general-plan-select');
        if (techSelect) techSelect.value = SHARED_ID;
        if (daySelect) daySelect.value = 'general';
        if (generalSelect) generalSelect.value = plan.id;
      }

      if (typeof saveDB === 'function') await saveDB();
      if (typeof renderPlan === 'function') renderPlan();

      const refreshedSelect = document.getElementById('general-plan-select');
      if (refreshedSelect) refreshedSelect.value = plan.id;

      if (typeof CM === 'function') {
        CM('preset-route-confirm-mo');
        CM('preset-routes-mo');
      }
      if (typeof notify === 'function') {
        const techNotice = selectedTechIds.length ? ` y asignada a ${selectedTechIds.length} técnico(s)` : '';
        notify(`Nueva ruta "${planName}" creada con ${builtStops.length} paradas${techNotice} ✓`);
      }
    } else {
      // Agregar al plan actual omitiendo los pueblos y antenas que ya existan
      if (typeof getPlanStopsRef === 'function') {
        const stopsRef = getPlanStopsRef();
        if (stopsRef) {
          const stopsToAdd = [];
          const skippedStops = [];

          builtStops.forEach(st => {
            if (isStopAlreadyInList(st, stopsRef)) {
              skippedStops.push(st);
            } else {
              stopsToAdd.push(st);
            }
          });

          if (!stopsToAdd.length) {
            if (typeof notify === 'function') notify('Todos los pueblos y antenas de esta ruta ya existen en el plan actual.', 'warn');
            return;
          }

          stopsRef.push(...stopsToAdd);

          // Si se seleccionaron técnicos adicionales, agregarlos al plan actual si es plan general
          if (quickOptions && Array.isArray(quickOptions.selectedTechIds) && quickOptions.selectedTechIds.length) {
            const currentPlan = typeof getSelectedGeneralPlan === 'function' ? getSelectedGeneralPlan() : null;
            if (currentPlan) {
              const currentIds = new Set(Array.isArray(currentPlan.assignedTechIds) ? currentPlan.assignedTechIds : (currentPlan.assignedTechId ? [currentPlan.assignedTechId] : []));
              quickOptions.selectedTechIds.forEach(id => currentIds.add(id));
              currentPlan.assignedTechIds = Array.from(currentIds);
              if (!currentPlan.assignedTechId) currentPlan.assignedTechId = currentPlan.assignedTechIds[0];
            }
          }

          if (typeof saveDB === 'function') await saveDB();
          if (typeof renderPlan === 'function') renderPlan();

          if (typeof CM === 'function') {
            CM('preset-route-confirm-mo');
            CM('preset-routes-mo');
          }
          if (typeof notify === 'function') {
            if (skippedStops.length > 0) {
              notify(`Se adjuntaron ${stopsToAdd.length} paradas (${skippedStops.length} omitidas por ya existir en el plan) ✓`);
            } else {
              notify(`Se adjuntaron ${stopsToAdd.length} paradas de "${route.name}" al plan actual ✓`);
            }
          }
        }
      }
    }
  };

  /**
   * Adjunta ruta a la página rutas.html
   */
  async function attachPresetRouteToRutasPage(route) {
    if (typeof canEditRoutes === 'function' && !canEditRoutes()) {
      if (typeof notify === 'function') notify('Solo el administrador puede crear rutas.', 'err');
      return;
    }

    const coords = route.stops.map((stopName, idx) => {
      const match = findSystemLocationMatch(stopName);
      return {
        lat: match ? match.lat : (17.55 + (idx * 0.02)),
        lng: match ? match.lng : (-99.50 - (idx * 0.02)),
        name: match ? match.name : stopName
      };
    });

    const newRoute = {
      id: (typeof gid === 'function' ? gid('r') : 'r_' + Date.now()),
      n: route.name,
      coords: coords,
      mapsUrl: route.mapsUrl || ''
    };

    if (!window.state) window.state = {};
    if (!Array.isArray(window.state.routes)) window.state.routes = [];
    window.state.routes.push(newRoute);

    if (typeof saveRecord === 'function') {
      await saveRecord('routes', newRoute);
    }
    if (typeof loadRoutePage === 'function') {
      await loadRoutePage();
    } else if (typeof renderRutas === 'function') {
      renderRutas();
    }

    if (typeof CM === 'function') CM('preset-routes-mo');
    if (typeof notify === 'function') {
      notify(`Ruta "${route.name}" guardada con ${coords.length} puntos ✓`);
    }
  }

  /**
   * Renderiza el contenido del modal de rutas recomendadas
   */
  let currentPresetCategory = 'all';

  root.renderPresetRoutesList = function () {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('preset-routes-grid');
    if (!container) return;

    const searchInput = document.getElementById('preset-routes-search');
    const query = searchInput ? searchInput.value : '';
    const routes = root.getPresetRoutes(currentPresetCategory, query);
    const isTech = (typeof isTechnicianPlanView === 'function' && isTechnicianPlanView()) ||
                   (typeof userHasRole === 'function' && userHasRole('tecnico'));
    const canManage = canManagePresetRoutes();

    if (!routes.length) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 16px; color: #64748b;">
          <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
          <strong style="font-size: 14px; color: #1e293b;">No se encontraron rutas</strong>
          <p style="font-size: 12px; margin-top: 4px;">Intenta con otro término de búsqueda o selecciona otra categoría.</p>
        </div>
      `;
      return;
    }

    const html = routes.map(route => {
      const routeTotalDetails = root.getRouteTotalRegisteredDetails(route);

      const stopsHtml = route.stops.map((s, idx) => {
        const stopDetails = root.getStopRegisteredDetails(s);
        const stopCount = stopDetails.length;
        const stopTooltip = `${stopCount} detalle${stopCount === 1 ? '' : 's'} registrado${stopCount === 1 ? '' : 's'} para ${escapeHtml(s)} y pueblos vinculados`;

        return `
          <span class="preset-stop-chip" title="Parada ${idx + 1}: ${escapeHtml(s)} · ${stopTooltip}">
            <span class="stop-num">${idx + 1}</span>
            <span class="stop-name">${escapeHtml(s)}</span>
            <span class="preset-stop-details-badge ${stopCount > 0 ? 'has-details' : 'zero-details'}" title="${stopTooltip}">
              ${stopCount}
            </span>
          </span>
        `;
      }).join('');

      const continuationsHtml = (route.continuations || []).map(cont => {
        const contTotalDetails = root.getRouteTotalRegisteredDetails(cont);

        return `
          <div class="preset-continuation-box">
            <div class="continuation-head">
              <div class="continuation-title-group">
                <strong>💡 Continuidad: ${escapeHtml(cont.name)}</strong>
                <span class="continuation-details-badge ${contTotalDetails.length > 0 ? 'has-details' : 'zero-details'}" title="${contTotalDetails.length} detalles registrados en esta continuidad">
                  ${contTotalDetails.length} det
                </span>
              </div>
              ${cont.mapsUrl ? `<a href="${cont.mapsUrl}" target="_blank" rel="noopener noreferrer" class="preset-link-btn" title="Abrir en Google Maps">🗺️ Maps</a>` : ''}
            </div>
            <div class="continuation-stops">
              ${cont.stops.map(cs => {
                const csDetails = root.getStopRegisteredDetails(cs);
                const csCount = csDetails.length;
                const csTooltip = `${csCount} detalle${csCount === 1 ? '' : 's'} registrado${csCount === 1 ? '' : 's'} para ${escapeHtml(cs)} y pueblos vinculados`;

                return `
                  <span class="continuation-stop-pill" title="${escapeHtml(cs)} · ${csTooltip}">
                    <span class="continuation-stop-name">${escapeHtml(cs)}</span>
                    <span class="preset-stop-details-badge ${csCount > 0 ? 'has-details' : 'zero-details'}" title="${csTooltip}">${csCount}</span>
                  </span>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="preset-route-card">
          <div class="preset-route-card-head">
            <div class="preset-route-card-toprow">
              <div class="preset-route-badges">
                <span class="preset-category-badge">${escapeHtml(route.category)}</span>
                <span class="preset-count-badge">${route.stops.length} paradas</span>
                <span class="preset-details-badge ${routeTotalDetails.length > 0 ? 'has-details' : 'zero-details'}" title="Total de detalles registrados en las antenas y pueblos vinculados de esta ruta">
                  ⚡ ${routeTotalDetails.length} detalle${routeTotalDetails.length === 1 ? '' : 's'}
                </span>
                ${route.isCustom ? '<span class="preset-confirm-badge badge-node">Personalizada</span>' : ''}
              </div>
              <div class="preset-route-card-actions-top">
                ${canManage ? `
                  <button type="button" class="btn bsm preset-edit-btn" onclick="openEditPresetRouteModal('${escapeAttr(route.id)}')" title="Editar ruta recomendada">
                    ✏️ Editar
                  </button>
                ` : ''}
                ${route.mapsUrl ? `
                  <a href="${route.mapsUrl}" target="_blank" rel="noopener noreferrer" class="preset-maps-btn" title="Ver trayecto en Google Maps">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>Google Maps</span>
                  </a>
                ` : ''}
              </div>
            </div>
            <h3 class="preset-route-title">${escapeHtml(route.name)}</h3>
          </div>

          ${route.notes ? `<p class="preset-route-notes">${escapeHtml(route.notes)}</p>` : ''}

          <div class="preset-stops-flow">
            ${stopsHtml}
          </div>

          ${continuationsHtml}

          ${!isTech ? `
          <div class="preset-card-actions">
            <button type="button" class="btn bc bsm preset-attach-btn" onclick="attachPresetRouteToPlan('${route.id}', true)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
              <span>Adjuntar a una ruta nueva</span>
            </button>
            <button type="button" class="btn bgh bsm preset-append-btn" onclick="attachPresetRouteToPlan('${route.id}', false)" title="Agregar estas paradas al plan que se encuentra abierto actualmente">
              <span>+ Al plan actual</span>
            </button>
          </div>
          ` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  };

  /**
   * Muestra el modal de confirmación con el resumen de paradas, destino y configuración rápida antes de agregar la ruta
   */
  root.showPresetRouteConfirmModal = function (routeId, asNewPlan = true) {
    if (typeof document === 'undefined') return;
    const allRoutes = root.getAllPresetRoutes();
    const route = allRoutes.find(r => r.id === routeId) || PRESET_ROUTES.find(r => r.id === routeId);
    if (!route) {
      if (typeof notify === 'function') notify('Ruta no encontrada.', 'err');
      return;
    }

    let modal = document.getElementById('preset-route-confirm-mo');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'preset-route-confirm-mo';
      modal.className = 'mo preset-confirm-modal-overlay';
      document.body.appendChild(modal);
    }

    const existingStops = (!asNewPlan && typeof getPlanStopsRef === 'function')
      ? (getPlanStopsRef() || [])
      : [];

    let newCount = 0;
    let existCount = 0;

    const stopsListHtml = route.stops.map((stopName, idx) => {
      const stopObj = buildStopObject(stopName, idx);
      const match = findSystemLocationMatch(stopName);
      const alreadyExists = !asNewPlan && isStopAlreadyInList(stopObj, existingStops);

      if (alreadyExists) {
        existCount++;
      } else {
        newCount++;
      }

      let badgeLabel = 'Manual';
      let badgeClass = 'badge-manual';
      if (match && match.type === 'equipment') {
        badgeLabel = 'Antena';
        badgeClass = 'badge-eq';
      } else if (match && match.type === 'node') {
        badgeLabel = 'Pueblo';
        badgeClass = 'badge-node';
      }

      const stopDetails = root.getStopRegisteredDetails(stopName);
      const stopDetCount = stopDetails.length;

      return `
        <div class="preset-confirm-stop-item ${alreadyExists ? 'stop-already-exists' : ''}">
          <div class="preset-confirm-stop-num">${idx + 1}</div>
          <div class="preset-confirm-stop-info">
            <input type="text" class="preset-confirm-stop-input" data-original-name="${escapeAttr(stopName)}" value="${escapeAttr(stopName)}" placeholder="Nombre de la parada...">
            ${match && match.lat ? `<div class="preset-confirm-stop-sub">GPS: ${match.lat.toFixed(4)}, ${match.lng.toFixed(4)}</div>` : ''}
          </div>
          <div class="preset-confirm-stop-type">
            ${alreadyExists ? '<span class="preset-confirm-badge badge-exists">Ya en el plan</span>' : ''}
            <span class="preset-confirm-badge ${badgeClass}">${badgeLabel}</span>
            <span class="preset-confirm-badge ${stopDetCount > 0 ? 'badge-has-det' : 'badge-zero-det'}" title="${stopDetCount} detalles registrados en ${escapeHtml(stopName)} y pueblos vinculados">${stopDetCount} det</span>
          </div>
        </div>
      `;
    }).join('');

    const destBannerHtml = asNewPlan ? `
      <div class="preset-confirm-dest-banner dest-new">
        <span class="dest-badge">Plan Nuevo</span>
        <span class="dest-text">Se creará una nueva ruta planificada independiente con estas paradas.</span>
      </div>
    ` : `
      <div class="preset-confirm-dest-banner dest-append">
        <span class="dest-badge">Plan Actual</span>
        <span class="dest-text">Se incorporarán <strong>${newCount} paradas nuevas</strong> a la cola del plan que tienes abierto actualmente.${existCount > 0 ? ` (${existCount} pueblos/antenas ya están en el plan y se omitirán).` : ''}</span>
      </div>
    `;

    const canConfirm = asNewPlan || newCount > 0;

    modal.innerHTML = `
      <div class="md preset-confirm-dialog-card">
        <div class="preset-confirm-head">
          <div class="preset-confirm-head-left">
            <span class="preset-confirm-head-icon">🚗</span>
            <div>
              <h3>¿Confirmar agregar ruta recomendada?</h3>
              <p>Revisa el resumen de las paradas, personaliza nombres y asigna técnicos antes de incorporar esta ruta.</p>
            </div>
          </div>
          <button type="button" class="preset-dialog-close" onclick="CM('preset-route-confirm-mo')" aria-label="Cerrar">✕</button>
        </div>
        <div class="preset-confirm-body">
          ${destBannerHtml}

          <!-- Configuración Rápida: Nombre de ruta y asignación de técnicos -->
          <div class="preset-quick-cfg-section">
            <div class="preset-quick-cfg-field">
              <label for="preset-confirm-plan-name">Nombre de la ruta / plan compartido:</label>
              <input type="text" id="preset-confirm-plan-name" class="preset-quick-input" value="${escapeAttr(route.name)}" placeholder="Ej. Ruta Chilpancingo Centro">
            </div>
            <div class="preset-quick-cfg-field">
              <label>Asignar técnico(s) al plan:</label>
              <div id="preset-quick-techs-list" class="preset-quick-techs-grid">
                ${renderQuickTechOptionsHtml([])}
              </div>
            </div>
          </div>

          <div class="preset-confirm-summary-card">
            <div class="preset-confirm-route-header">
              <div class="preset-confirm-route-name">${escapeHtml(route.name)}</div>
              ${route.notes ? `<div class="preset-confirm-notes">${escapeHtml(route.notes)}</div>` : ''}
            </div>
            <div class="preset-confirm-stops-wrapper">
              <div class="preset-confirm-stops-header">
                <span>Paradas de la ruta (${route.stops.length}${!asNewPlan && existCount > 0 ? ` · ${newCount} a agregar` : ''}) - Edita el nombre si es necesario</span>
              </div>
              <div class="preset-confirm-stops-list">
                ${stopsListHtml}
              </div>
            </div>
          </div>
        </div>
        <div class="preset-confirm-footer">
          <button type="button" class="btn bgh" onclick="CM('preset-route-confirm-mo')">Cancelar</button>
          <button type="button" class="btn bc preset-confirm-action-btn" ${!canConfirm ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} onclick="confirmAndAttachPresetRoute('${route.id}', ${asNewPlan})">
            <span>${asNewPlan ? `Confirmar y crear nueva ruta (${route.stops.length} paradas)` : (newCount > 0 ? `Confirmar e incorporar (${newCount} paradas nuevas)` : 'Todos ya existen en el plan')}</span>
          </button>
        </div>
      </div>
    `;

    if (typeof OM === 'function') OM('preset-route-confirm-mo');
  };

  /**
   * Ejecuta la incorporación de la ruta una vez confirmada con configuración rápida
   */
  root.confirmAndAttachPresetRoute = function (routeId, asNewPlan = true) {
    const planNameInput = (typeof document !== 'undefined' && typeof document.getElementById === 'function')
      ? document.getElementById('preset-confirm-plan-name')
      : null;
    const customPlanName = planNameInput ? planNameInput.value.trim() : '';

    const stopInputs = (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function')
      ? document.querySelectorAll('#preset-route-confirm-mo .preset-confirm-stop-input')
      : [];
    const customStops = Array.from(stopInputs).map(inp => ({
      originalName: inp.dataset?.originalName || '',
      newName: (inp.value ? inp.value.trim() : '') || inp.dataset?.originalName || ''
    }));

    const checkedTechs = (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function')
      ? document.querySelectorAll('#preset-quick-techs-list input[name="preset-quick-tech"]:checked')
      : [];
    const selectedTechIds = Array.from(checkedTechs).map(cb => cb.value);

    if (typeof CM === 'function') {
      CM('preset-route-confirm-mo');
      CM('preset-routes-mo');
    }
    return root.attachPresetRouteToPlan(routeId, asNewPlan, true, {
      customPlanName,
      customStops,
      selectedTechIds
    });
  };

  /**
   * Abre modal para crear una nueva ruta recomendada
   */
  root.openCreatePresetRouteModal = function () {
    if (!canManagePresetRoutes()) {
      if (typeof notify === 'function') notify('Solo administradores y soporte pueden crear rutas recomendadas.', 'warn');
      return;
    }
    const newRoute = {
      id: 'custom_route_' + Date.now(),
      name: '',
      category: 'Chilpancingo / Centro',
      mapsUrl: '',
      notes: '',
      stops: ['', ''],
      continuations: [],
      isCustom: true
    };
    renderPresetRouteFormModal(newRoute, true);
  };

  /**
   * Abre modal para editar una ruta recomendada existente
   */
  root.openEditPresetRouteModal = function (routeId) {
    if (!canManagePresetRoutes()) {
      if (typeof notify === 'function') notify('Solo administradores y soporte pueden editar rutas recomendadas.', 'warn');
      return;
    }
    const allRoutes = root.getAllPresetRoutes();
    const route = allRoutes.find(r => r.id === routeId);
    if (!route) {
      if (typeof notify === 'function') notify('Ruta no encontrada.', 'err');
      return;
    }
    renderPresetRouteFormModal({ ...route, stops: [...route.stops] }, false);
  };

  /**
   * Renderiza el modal de formulario para crear/editar ruta recomendada
   */
  function renderPresetRouteFormModal(routeData, isNew = false) {
    if (typeof document === 'undefined') return;
    let modal = document.getElementById('preset-route-form-mo');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'preset-route-form-mo';
      modal.className = 'mo preset-form-modal-overlay';
      document.body.appendChild(modal);
    }

    const categories = [
      'Chilpancingo / Centro',
      'Iguala / Norte',
      'Ayutla / Costa Chica',
      'San Marcos / Costa Chica',
      'San Marcos / Ometepec',
      'Acapulco / Coyuca',
      'Morelos y Puebla',
      'Recorridos 1..N'
    ];

    const catOptionsHtml = categories.map(cat => `
      <option value="${escapeAttr(cat)}" ${routeData.category === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>
    `).join('');

    const stopsRowsHtml = (routeData.stops && routeData.stops.length ? routeData.stops : ['']).map((stopName, idx) => `
      <div class="preset-form-stop-row" data-idx="${idx}">
        <span class="preset-form-stop-num">${idx + 1}</span>
        <input type="text" class="preset-form-stop-input" value="${escapeAttr(stopName)}" placeholder="Nombre de la antena, pueblo o parada..." list="preset-form-location-datalist">
        <button type="button" class="btn bsm bgh" onclick="movePresetFormStopRow(this, -1)" title="Subir parada" style="padding:4px 8px;">▲</button>
        <button type="button" class="btn bsm bgh" onclick="movePresetFormStopRow(this, 1)" title="Bajar parada" style="padding:4px 8px;">▼</button>
        <button type="button" class="btn bsm" onclick="removePresetFormStopRow(this)" title="Eliminar parada" style="padding:4px 8px;color:#dc2626;">✕</button>
      </div>
    `).join('');

    // Datalist con antenas y nodos registrados para autocompletado rápido
    const datalistOptions = [];
    if (typeof state !== 'undefined') {
      (state.equipments || []).forEach(eq => {
        if (!eq.deletedAt && eq.name) datalistOptions.push(`<option value="${escapeAttr(eq.name)}">Antena: ${escapeHtml(eq.name)}</option>`);
      });
      (state.nodes || []).forEach(nd => {
        if (!nd.deletedAt && (nd.town || nd.name)) {
          const tName = nd.town || nd.name;
          datalistOptions.push(`<option value="${escapeAttr(tName)}">Pueblo: ${escapeHtml(tName)}</option>`);
        }
      });
    }

    modal.innerHTML = `
      <div class="md preset-form-dialog-card">
        <div class="preset-confirm-head">
          <div class="preset-confirm-head-left">
            <span class="preset-confirm-head-icon" style="background:linear-gradient(135deg, #e0f2fe, #bae6fd);color:#0284c7;">✏️</span>
            <div>
              <h3>${isNew ? 'Nueva Ruta Recomendada' : 'Editar Ruta Recomendada'}</h3>
              <p>${isNew ? 'Define las paradas, región y enlace de mapa de la nueva ruta troncal.' : 'Modifica las paradas, nombre o detalles de la ruta seleccionada.'}</p>
            </div>
          </div>
          <button type="button" class="preset-dialog-close" onclick="CM('preset-route-form-mo')" aria-label="Cerrar">✕</button>
        </div>
        <div class="preset-form-body">
          <input type="hidden" id="preset-form-route-id" value="${escapeAttr(routeData.id)}">
          <input type="hidden" id="preset-form-is-new" value="${isNew ? '1' : '0'}">

          <datalist id="preset-form-location-datalist">
            ${datalistOptions.slice(0, 100).join('')}
          </datalist>

          <div class="preset-form-field">
            <label for="preset-form-name">Nombre de la ruta *</label>
            <input type="text" id="preset-form-name" value="${escapeAttr(routeData.name)}" placeholder="Ej. Ruta Chilpancingo - Tixtla - Chilapa" required>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="preset-form-field">
              <label for="preset-form-category">Región / Categoría</label>
              <select id="preset-form-category">
                ${catOptionsHtml}
              </select>
            </div>
            <div class="preset-form-field">
              <label for="preset-form-maps-url">Enlace Google Maps (opcional)</label>
              <input type="url" id="preset-form-maps-url" value="${escapeAttr(routeData.mapsUrl || '')}" placeholder="https://maps.app.goo.gl/...">
            </div>
          </div>

          <div class="preset-form-field">
            <label for="preset-form-notes">Notas / Descripción descriptiva</label>
            <textarea id="preset-form-notes" rows="2" placeholder="Notas sobre el corredor, accesos o recomendaciones operativas...">${escapeHtml(routeData.notes || '')}</textarea>
          </div>

          <div class="preset-form-stops-container">
            <div class="preset-form-stops-head">
              <label style="font-size:12.5px;font-weight:800;color:#1e293b;">Paradas en orden geográfico</label>
              <button type="button" class="btn bsm bc" onclick="addPresetFormStopRow()" style="font-size:11px;padding:4px 10px;">+ Agregar parada</button>
            </div>
            <div class="preset-form-stops-list" id="preset-form-stops-list">
              ${stopsRowsHtml}
            </div>
          </div>
        </div>
        <div class="preset-confirm-footer">
          ${!isNew && routeData.isCustom ? `
            <button type="button" class="btn bgh" style="margin-right:auto;color:#dc2626;border-color:#fca5a5;" onclick="deleteCustomPresetRoute('${escapeAttr(routeData.id)}')">🗑️ Eliminar ruta</button>
          ` : ''}
          <button type="button" class="btn bgh" onclick="CM('preset-route-form-mo')">Cancelar</button>
          <button type="button" class="btn bc preset-confirm-action-btn" onclick="savePresetRouteForm()">
            <span>Guardar ruta recomendada</span>
          </button>
        </div>
      </div>
    `;

    if (typeof OM === 'function') OM('preset-route-form-mo');
  }

  root.addPresetFormStopRow = function (stopName = '') {
    const list = document.getElementById('preset-form-stops-list');
    if (!list) return;
    const currentCount = list.querySelectorAll('.preset-form-stop-row').length;
    const row = document.createElement('div');
    row.className = 'preset-form-stop-row';
    row.dataset.idx = currentCount;
    row.innerHTML = `
      <span class="preset-form-stop-num">${currentCount + 1}</span>
      <input type="text" class="preset-form-stop-input" value="${escapeAttr(stopName)}" placeholder="Nombre de la antena, pueblo o parada..." list="preset-form-location-datalist">
      <button type="button" class="btn bsm bgh" onclick="movePresetFormStopRow(this, -1)" title="Subir parada" style="padding:4px 8px;">▲</button>
      <button type="button" class="btn bsm bgh" onclick="movePresetFormStopRow(this, 1)" title="Bajar parada" style="padding:4px 8px;">▼</button>
      <button type="button" class="btn bsm" onclick="removePresetFormStopRow(this)" title="Eliminar parada" style="padding:4px 8px;color:#dc2626;">✕</button>
    `;
    list.appendChild(row);
    row.querySelector('input')?.focus();
  };

  root.removePresetFormStopRow = function (btn) {
    const row = btn.closest('.preset-form-stop-row');
    if (!row) return;
    const list = row.parentElement;
    row.remove();
    // Renumerar
    list.querySelectorAll('.preset-form-stop-row').forEach((r, idx) => {
      const numSpan = r.querySelector('.preset-form-stop-num');
      if (numSpan) numSpan.textContent = idx + 1;
      r.dataset.idx = idx;
    });
  };

  root.movePresetFormStopRow = function (btn, direction) {
    const row = btn.closest('.preset-form-stop-row');
    if (!row) return;
    const list = row.parentElement;
    if (direction === -1 && row.previousElementSibling) {
      list.insertBefore(row, row.previousElementSibling);
    } else if (direction === 1 && row.nextElementSibling) {
      list.insertBefore(row.nextElementSibling, row);
    }
    // Renumerar
    list.querySelectorAll('.preset-form-stop-row').forEach((r, idx) => {
      const numSpan = r.querySelector('.preset-form-stop-num');
      if (numSpan) numSpan.textContent = idx + 1;
      r.dataset.idx = idx;
    });
  };

  root.savePresetRouteForm = function () {
    const idInput = document.getElementById('preset-form-route-id');
    const nameInput = document.getElementById('preset-form-name');
    const catInput = document.getElementById('preset-form-category');
    const mapsInput = document.getElementById('preset-form-maps-url');
    const notesInput = document.getElementById('preset-form-notes');

    const routeId = idInput ? idInput.value : ('custom_route_' + Date.now());
    const name = nameInput ? nameInput.value.trim() : '';
    const category = catInput ? catInput.value : 'Chilpancingo / Centro';
    const mapsUrl = mapsInput ? mapsInput.value.trim() : '';
    const notes = notesInput ? notesInput.value.trim() : '';

    if (!name) {
      if (typeof notify === 'function') notify('Por favor ingresa un nombre para la ruta.', 'warn');
      nameInput?.focus();
      return;
    }

    const stopInputs = document.querySelectorAll('#preset-form-stops-list .preset-form-stop-input');
    const stops = Array.from(stopInputs).map(inp => inp.value.trim()).filter(Boolean);

    if (!stops.length) {
      if (typeof notify === 'function') notify('Debes agregar al menos una parada a la ruta.', 'warn');
      return;
    }

    const customRoutes = getCustomPresetRoutes();
    const existingIdx = customRoutes.findIndex(r => r.id === routeId);

    const savedRoute = {
      id: routeId,
      name,
      category,
      mapsUrl,
      notes,
      stops,
      continuations: [],
      isCustom: true,
      updatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      customRoutes[existingIdx] = savedRoute;
    } else {
      customRoutes.push(savedRoute);
    }

    saveCustomPresetRoutes(customRoutes);

    if (typeof CM === 'function') CM('preset-route-form-mo');
    root.renderPresetRoutesList();

    if (typeof notify === 'function') {
      notify(`Ruta recomendada "${name}" guardada correctamente ✓`);
    }
  };

  root.deleteCustomPresetRoute = async function (routeId) {
    if (!canManagePresetRoutes()) return;
    if (typeof askConfirmation === 'function') {
      const ok = await askConfirmation({
        title: 'Eliminar ruta personalizada',
        message: '¿Estás seguro de eliminar esta ruta personalizada?',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        tone: 'danger'
      });
      const confirmFn = typeof askConfirmation === 'function' ? askConfirmation : window.askConfirmation;
      if (typeof confirmFn === 'function') {
        const ok = await confirmFn({
          title: 'Eliminar ruta personalizada',
          message: '¿Estás seguro de eliminar esta ruta personalizada? Esta acción no se puede deshacer.',
          confirmText: 'Eliminar',
          cancelText: 'Cancelar',
          tone: 'danger'
        });
        if (!ok) return;
      }
    }
    let customRoutes = getCustomPresetRoutes();
    customRoutes = customRoutes.filter(r => r.id !== routeId);
    saveCustomPresetRoutes(customRoutes);

    if (typeof CM === 'function') CM('preset-route-form-mo');
    root.renderPresetRoutesList();

    if (typeof notify === 'function') {
      notify('Ruta personalizada eliminada.');
    }
  };

  /**
   * Muestra el modal de confirmación con el resumen de paradas antes de agregar una continuidad
   */
  root.showContinuityConfirmModal = function (continuityName) {
    if (typeof document === 'undefined') return;

    const allRoutes = root.getAllPresetRoutes();
    let targetCont = null;
    let parentRoute = null;

    for (const route of allRoutes) {
      const found = (route.continuations || []).find(c => c.name === continuityName);
      if (found) {
        targetCont = found;
        parentRoute = route;
        break;
      }
    }

    if (!targetCont) {
      if (typeof notify === 'function') notify('Continuidad no encontrada.', 'err');
      return;
    }

    let modal = document.getElementById('preset-route-confirm-mo');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'preset-route-confirm-mo';
      modal.className = 'mo preset-confirm-modal-overlay';
      document.body.appendChild(modal);
    }

    const existingStops = typeof getPlanStopsRef === 'function' ? (getPlanStopsRef() || []) : [];
    let newCount = 0;
    let existCount = 0;

    const stopsListHtml = targetCont.stops.map((stopName, idx) => {
      const stopObj = buildStopObject(stopName, idx, `Continuidad: ${targetCont.name}`);
      const match = findSystemLocationMatch(stopName);
      const alreadyExists = isStopAlreadyInList(stopObj, existingStops);

      if (alreadyExists) {
        existCount++;
      } else {
        newCount++;
      }

      let badgeLabel = 'Manual';
      let badgeClass = 'badge-manual';
      if (match && match.type === 'equipment') {
        badgeLabel = 'Antena';
        badgeClass = 'badge-eq';
      } else if (match && match.type === 'node') {
        badgeLabel = 'Pueblo';
        badgeClass = 'badge-node';
      }

      const stopDetails = root.getStopRegisteredDetails(stopName);
      const stopDetCount = stopDetails.length;

      return `
        <div class="preset-confirm-stop-item ${alreadyExists ? 'stop-already-exists' : ''}">
          <div class="preset-confirm-stop-num">${idx + 1}</div>
          <div class="preset-confirm-stop-info">
            <input type="text" class="preset-confirm-stop-input" data-original-name="${escapeAttr(stopName)}" value="${escapeAttr(stopName)}" placeholder="Nombre de la parada...">
            ${match && match.lat ? `<div class="preset-confirm-stop-sub">GPS: ${match.lat.toFixed(4)}, ${match.lng.toFixed(4)}</div>` : ''}
          </div>
          <div class="preset-confirm-stop-type">
            ${alreadyExists ? '<span class="preset-confirm-badge badge-exists">Ya en el plan</span>' : ''}
            <span class="preset-confirm-badge ${badgeClass}">${badgeLabel}</span>
            <span class="preset-confirm-badge ${stopDetCount > 0 ? 'badge-has-det' : 'badge-zero-det'}" title="${stopDetCount} detalles registrados en ${escapeHtml(stopName)} y pueblos vinculados">${stopDetCount} det</span>
          </div>
        </div>
      `;
    }).join('');

    const canConfirm = newCount > 0;

    modal.innerHTML = `
      <div class="md preset-confirm-dialog-card">
        <div class="preset-confirm-head">
          <div class="preset-confirm-head-left">
            <span class="preset-confirm-head-icon">💡</span>
            <div>
              <h3>¿Confirmar agregar continuidad al plan?</h3>
              <p>Revisa las paradas y pueblos sugeridos antes de incorporarlos al plan actual.</p>
            </div>
          </div>
          <button type="button" class="preset-dialog-close" onclick="CM('preset-route-confirm-mo')" aria-label="Cerrar">✕</button>
        </div>
        <div class="preset-confirm-body">
          <div class="preset-confirm-dest-banner dest-append">
            <span class="dest-badge">Continuidad al Plan Actual</span>
            <span class="dest-text">Se incorporarán <strong>${newCount} paradas nuevas</strong> al plan actual.${existCount > 0 ? ` (${existCount} pueblos/antenas ya están en el plan y se omitirán).` : ''}</span>
          </div>

          <!-- Configuración rápida de técnicos para el plan -->
          <div class="preset-quick-cfg-section">
            <div class="preset-quick-cfg-field">
              <label>Asignar técnico(s) al plan:</label>
              <div id="preset-quick-techs-list" class="preset-quick-techs-grid">
                ${renderQuickTechOptionsHtml([])}
              </div>
            </div>
          </div>

          <div class="preset-confirm-summary-card">
            <div class="preset-confirm-route-header">
              <div class="preset-confirm-route-name">${escapeHtml(targetCont.name)}</div>
              ${parentRoute ? `<div class="preset-confirm-notes">Continuidad sugerida de: <strong>${escapeHtml(parentRoute.name)}</strong></div>` : ''}
            </div>
            <div class="preset-confirm-stops-wrapper">
              <div class="preset-confirm-stops-header">
                <span>Paradas de continuidad (${targetCont.stops.length}${existCount > 0 ? ` · ${newCount} nuevas` : ''}) - Edita el nombre si lo deseas</span>
              </div>
              <div class="preset-confirm-stops-list">
                ${stopsListHtml}
              </div>
            </div>
          </div>
        </div>
        <div class="preset-confirm-footer">
          <button type="button" class="btn bgh" onclick="CM('preset-route-confirm-mo')">Cancelar</button>
          <button type="button" class="btn bc preset-confirm-action-btn" ${!canConfirm ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} onclick="confirmAndAddContinuity('${escapeHtml(continuityName)}')">
            <span>${newCount > 0 ? `Confirmar e incorporar (${newCount} paradas nuevas)` : 'Todos ya existen en el plan'}</span>
          </button>
        </div>
      </div>
    `;

    if (typeof OM === 'function') OM('preset-route-confirm-mo');
  };

  /**
   * Ejecuta la incorporación de la continuidad una vez confirmada
   */
  root.confirmAndAddContinuity = function (continuityName) {
    const stopInputs = (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function')
      ? document.querySelectorAll('#preset-route-confirm-mo .preset-confirm-stop-input')
      : [];
    const customStops = Array.from(stopInputs).map(inp => ({
      originalName: inp.dataset?.originalName || '',
      newName: (inp.value ? inp.value.trim() : '') || inp.dataset?.originalName || ''
    }));

    const checkedTechs = (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function')
      ? document.querySelectorAll('#preset-quick-techs-list input[name="preset-quick-tech"]:checked')
      : [];
    const selectedTechIds = Array.from(checkedTechs).map(cb => cb.value);

    if (typeof CM === 'function') CM('preset-route-confirm-mo');
    return root.addContinuityStopsToCurrentPlan(continuityName, true, {
      customStops,
      selectedTechIds
    });
  };

  /**
   * Abre el modal del catálogo de rutas mostrando animación de carga inmediata
   */
  root.openPresetRoutesModal = function (options = {}) {
    if (typeof document === 'undefined') return;
    let modal = document.getElementById('preset-routes-mo');
    if (!modal) {
      createPresetRoutesModalMarkup();
      modal = document.getElementById('preset-routes-mo');
    }

    const searchInput = document.getElementById('preset-routes-search');
    if (searchInput) searchInput.value = '';
    currentPresetCategory = options.category || 'all';

    const tabs = document.querySelectorAll('.preset-cat-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === currentPresetCategory);
    });

    const addNewBtn = document.getElementById('preset-add-new-btn');
    if (addNewBtn) {
      addNewBtn.style.display = canManagePresetRoutes() ? 'inline-flex' : 'none';
    }

    // Mostrar animación de carga inmediata para respuesta instantánea de UI
    const container = document.getElementById('preset-routes-grid');
    if (container) {
      container.innerHTML = `
        <div class="preset-loading-container">
          <div class="preset-loading-spinner"></div>
          <strong style="margin-top:16px; font-size:15px; color:#0f172a; font-weight:800;">Cargando catálogo de rutas...</strong>
          <span style="margin-top:6px; font-size:12.5px; color:#64748b;">Consultando paradas, continuidades y detalles registrados...</span>
        </div>
      `;
    }

    if (typeof OM === 'function') OM('preset-routes-mo');

    // Ceder el hilo para que el navegador renderice la animación de carga antes del cálculo
    setTimeout(() => {
      root.renderPresetRoutesList();
    }, 40);
  };

  /**
   * Selecciona categoría de rutas en el modal
   */
  root.selectPresetCategory = function (cat) {
    currentPresetCategory = cat;
    if (typeof document !== 'undefined') {
      const tabs = document.querySelectorAll('.preset-cat-tab');
      tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.cat === cat);
      });
    }
    root.renderPresetRoutesList();
  };

  /**
   * Crea el modal en el DOM si no existe
   */
  function createPresetRoutesModalMarkup() {
    if (typeof document === 'undefined') return;
    const markup = `
      <div class="mo preset-routes-modal-overlay" id="preset-routes-mo">
        <div class="md preset-routes-dialog-card">
          <div class="preset-dialog-head">
            <div class="preset-head-left">
              <span class="preset-head-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>
                </svg>
              </span>
              <div>
                <h2>Catálogo de Rutas y Recorridos Preestablecidos</h2>
                <p>Corredores troncales, enlaces de Google Maps y continuidades geográficas. Da clic en <strong>Adjuntar a una ruta nueva</strong> para cargarla inmediatamente.</p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <button type="button" id="preset-add-new-btn" class="preset-new-route-btn" style="display:none;" onclick="openCreatePresetRouteModal()">+ Nueva ruta recomendada</button>
              <button type="button" class="preset-dialog-close" onclick="CM('preset-routes-mo')" aria-label="Cerrar">✕</button>
            </div>
          </div>

          <div class="preset-dialog-filterbar">
            <div class="preset-search-wrap">
              <span class="preset-search-icon">🔍</span>
              <input type="text" id="preset-routes-search" placeholder="Buscar por nombre de ruta, pueblo, antena o región..." oninput="debounceAction('preset-routes-search', renderPresetRoutesList)">
            </div>
            <div class="preset-cat-tabs" role="tablist">
              <button type="button" class="preset-cat-tab active" data-cat="all" onclick="selectPresetCategory('all')">Todas (${root.getAllPresetRoutes().length})</button>
              <button type="button" class="preset-cat-tab" data-cat="Chilpancingo / Centro" onclick="selectPresetCategory('Chilpancingo / Centro')">Chilpancingo</button>
              <button type="button" class="preset-cat-tab" data-cat="Iguala / Norte" onclick="selectPresetCategory('Iguala / Norte')">Iguala / Norte</button>
              <button type="button" class="preset-cat-tab" data-cat="Ayutla / Costa Chica" onclick="selectPresetCategory('Ayutla / Costa Chica')">Ayutla</button>
              <button type="button" class="preset-cat-tab" data-cat="San Marcos / Costa Chica" onclick="selectPresetCategory('San Marcos / Costa Chica')">San Marcos</button>
              <button type="button" class="preset-cat-tab" data-cat="San Marcos / Ometepec" onclick="selectPresetCategory('San Marcos / Ometepec')">Ometepec</button>
              <button type="button" class="preset-cat-tab" data-cat="Acapulco / Coyuca" onclick="selectPresetCategory('Acapulco / Coyuca')">Acapulco / Coyuca</button>
              <button type="button" class="preset-cat-tab" data-cat="Morelos y Puebla" onclick="selectPresetCategory('Morelos y Puebla')">Puebla / Morelos</button>
              <button type="button" class="preset-cat-tab" data-cat="Recorridos 1..N" onclick="selectPresetCategory('Recorridos 1..N')">Recorridos 1..N</button>
            </div>
          </div>

          <div class="preset-routes-body" id="preset-routes-grid">
            <!-- Cargado dinámicamente -->
          </div>

          <div class="preset-dialog-footer">
            <div style="font-size: 11.5px; color: #64748b;">
              💡 Las rutas seleccionadas vinculan automáticamente las coordenadas de antenas y pueblos registrados.
            </div>
            <button type="button" class="btn bgh" onclick="CM('preset-routes-mo')">Cerrar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', markup);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  /**
   * Revisa si el plan actual tiene paradas que activan recomendaciones de continuidad
   * Exclusivo para administradores y soporte; nunca se muestra a técnicos
   */
  root.checkPlanContinuityRecommendations = function () {
    if (typeof document === 'undefined') return;
    const banner = document.getElementById('plan-continuity-recommendations-banner');
    if (!banner) return;

    // Solo permitido para administradores y soporte; técnicos y otros roles NO deben verlo
    const isTech = (typeof isTechnicianPlanView === 'function' && isTechnicianPlanView()) ||
                   (typeof userHasRole === 'function' && userHasRole('tecnico'));
    const isSoporteOrAdmin = typeof userHasRole === 'function' && userHasRole('administrador', 'admin', 'soporte');

    if (isTech || !isSoporteOrAdmin) {
      banner.style.display = 'none';
      banner.innerHTML = '';
      return;
    }

    if (typeof getPlanStopsRef !== 'function') {
      banner.style.display = 'none';
      return;
    }

    const stops = getPlanStopsRef();
    if (!stops || !stops.length) {
      banner.style.display = 'none';
      banner.innerHTML = '';
      return;
    }

    const stopNames = stops.map(s => s.name || '').filter(Boolean);
    const recommendations = root.findContinuityRecommendations(stopNames);

    if (!recommendations.length) {
      banner.style.display = 'none';
      banner.innerHTML = '';
      return;
    }

    // Tomar la primera recomendación más relevante
    const rec = recommendations[0];
    banner.style.display = 'flex';
    banner.innerHTML = `
      <div class="plan-continuity-left">
        <span class="plan-continuity-icon">💡</span>
        <div class="plan-continuity-text">
          <strong>Recomendación de continuidad: ${escapeHtml(rec.name)}</strong>
          <p>Este plan incluye paradas de <em>${escapeHtml(rec.parentRoute)}</em>. Pueblos sugeridos para continuar ruta: <strong>${escapeHtml(rec.missingStops.slice(0, 6).join(', '))}${rec.missingStops.length > 6 ? '...' : ''}</strong></p>
        </div>
      </div>
      <div class="plan-continuity-actions">
        ${rec.mapsUrl ? `<a href="${rec.mapsUrl}" target="_blank" rel="noopener noreferrer" class="preset-maps-btn" title="Ver trayecto en Google Maps">🗺️ Maps</a>` : ''}
        <button type="button" class="btn bc bsm" onclick="addContinuityStopsToCurrentPlan('${escapeHtml(rec.name)}')">+ Agregar continuidad al plan</button>
      </div>
    `;
  };

  /**
   * Agrega las paradas de una continuidad al plan actual
   */
  root.addContinuityStopsToCurrentPlan = async function (continuityName, confirmed = false, quickOptions = null) {
    const isTech = (typeof isTechnicianPlanView === 'function' && isTechnicianPlanView()) ||
                   (typeof userHasRole === 'function' && userHasRole('tecnico'));
    const isSoporteOrAdmin = typeof userHasRole === 'function' && userHasRole('administrador', 'admin', 'soporte');

    if (isTech || !isSoporteOrAdmin) {
      if (typeof notify === 'function') notify('Solo administradores y soporte pueden agregar continuidades al plan.', 'warn');
      return;
    }

    if (!confirmed && typeof document !== 'undefined' && document.body && typeof OM === 'function') {
      return root.showContinuityConfirmModal(continuityName);
    }

    const allRoutes = root.getAllPresetRoutes();
    let targetCont = null;
    let parentRoute = null;

    for (const route of allRoutes) {
      const found = (route.continuations || []).find(c => c.name === continuityName);
      if (found) {
        targetCont = found;
        parentRoute = route;
        break;
      }
    }

    if (!targetCont) {
      if (typeof notify === 'function') notify('Continuidad no encontrada.', 'err');
      return;
    }

    if (typeof getPlanStopsRef !== 'function') return;
    const stopsRef = getPlanStopsRef();
    if (!stopsRef) return;

    const newStops = [];
    const skippedStops = [];

    targetCont.stops.forEach((stopName, idx) => {
      let finalName = stopName;
      if (quickOptions && Array.isArray(quickOptions.customStops)) {
        const found = quickOptions.customStops[idx];
        if (found && found.newName) finalName = found.newName;
      }
      const stopObj = buildStopObject(finalName, idx, `Continuidad: ${targetCont.name}`);
      if (isStopAlreadyInList(stopObj, stopsRef)) {
        skippedStops.push(stopObj);
      } else {
        newStops.push(stopObj);
      }
    });

    // Registrar continuidad como aplicada para que desaparezca y no vuelva a ofrecerse
    appliedContinuities.add(continuityName);

    // Ocultar banner de continuidad inmediatamente para que desaparezca
    if (typeof document !== 'undefined') {
      const banner = document.getElementById('plan-continuity-recommendations-banner');
      if (banner) {
        banner.style.display = 'none';
        banner.innerHTML = '';
      }
    }

    if (typeof CM === 'function') {
      CM('preset-route-confirm-mo');
    }

    if (!newStops.length) {
      if (typeof notify === 'function') notify('Todos los pueblos y antenas de esta continuidad ya existen en el plan actual.', 'warn');
      if (typeof renderPlan === 'function') renderPlan();
      return;
    }

    stopsRef.push(...newStops);

    // Si se asignaron técnicos adicionales en configuración rápida, aplicarlos al plan
    if (quickOptions && Array.isArray(quickOptions.selectedTechIds) && quickOptions.selectedTechIds.length) {
      const currentPlan = typeof getSelectedGeneralPlan === 'function' ? getSelectedGeneralPlan() : null;
      if (currentPlan) {
        const currentIds = new Set(Array.isArray(currentPlan.assignedTechIds) ? currentPlan.assignedTechIds : (currentPlan.assignedTechId ? [currentPlan.assignedTechId] : []));
        quickOptions.selectedTechIds.forEach(id => currentIds.add(id));
        currentPlan.assignedTechIds = Array.from(currentIds);
        if (!currentPlan.assignedTechId) currentPlan.assignedTechId = currentPlan.assignedTechIds[0];
      }
    }

    if (typeof saveDB === 'function') await saveDB();
    if (typeof renderPlan === 'function') renderPlan();

    if (typeof notify === 'function') {
      if (skippedStops.length > 0) {
        notify(`Se agregaron ${newStops.length} paradas de "${targetCont.name}" (${skippedStops.length} omitidas por ya existir) ✓`);
      } else {
        notify(`Se agregaron ${newStops.length} paradas de "${targetCont.name}" al plan ✓`);
      }
    }
  };

  /**
   * Renderiza los chips rápidos de rutas populares en el modal de crear plan
   */
  root.renderCreatePlanQuickChips = function () {
    if (typeof document === 'undefined') return;
    const chipsContainer = document.getElementById('plan-create-quick-chips');
    if (!chipsContainer) return;

    // Seleccionar corredores representativos
    const popularIds = [
      'corredor-chilpancingo-iguala',
      'corredor-chilpancingo-rio-balsas',
      'corredor-iguala-xochimilco',
      'corredor-ayutla-caxitepec',
      'corredor-chilpancingo-san-marcos',
      'corredor-ometepec-llano-grande',
      'corredor-chilpancingo-puebla-maravillas',
      'corredor-coyuca-la-remontita',
      'corredor-chilpancingo-atlixtac',
      'recorrido-tlayolapa'
    ];

    const popularRoutes = root.getAllPresetRoutes().filter(r => popularIds.includes(r.id));
    chipsContainer.innerHTML = popularRoutes.map(r => {
      const rDetails = root.getRouteTotalRegisteredDetails(r);
      const detText = rDetails.length ? ` · ${rDetails.length} det` : '';
      return `
        <button type="button" class="plan-create-preset-chip" onclick="applyPresetRouteToCreateModal('${r.id}')" title="Cargar ${r.stops.length} paradas (${rDetails.length} detalles) de ${escapeHtml(r.name)}">
          <span>🚗</span>
          <span>${escapeHtml(r.name.replace(/^Ruta\s+/i, ''))}</span>
          <small style="opacity:0.7">(${r.stops.length}${detText})</small>
        </button>
      `;
    }).join('');
  };

  /**
   * Al dar clic en un chip del modal de creación, llena el campo y crea el plan con las paradas
   */
  root.applyPresetRouteToCreateModal = function (routeId) {
    const allRoutes = root.getAllPresetRoutes();
    const route = allRoutes.find(r => r.id === routeId) || PRESET_ROUTES.find(r => r.id === routeId);
    if (!route) return;

    const input = document.getElementById('plan-create-name');
    if (input) input.value = route.name;

    // Adjuntar la ruta directamente
    root.attachPresetRouteToPlan(routeId, true);
    if (typeof CM === 'function') CM('plan-create-mo');
  };

  if (typeof window !== 'undefined') {
    window.showPresetRouteConfirmModal = root.showPresetRouteConfirmModal;
    window.confirmAndAttachPresetRoute = root.confirmAndAttachPresetRoute;
    window.showContinuityConfirmModal = root.showContinuityConfirmModal;
    window.confirmAndAddContinuity = root.confirmAndAddContinuity;
    window.attachPresetRouteToPlan = root.attachPresetRouteToPlan;
    window.addContinuityStopsToCurrentPlan = root.addContinuityStopsToCurrentPlan;
    window.openCreatePresetRouteModal = root.openCreatePresetRouteModal;
    window.openEditPresetRouteModal = root.openEditPresetRouteModal;
    window.addPresetFormStopRow = root.addPresetFormStopRow;
    window.removePresetFormStopRow = root.removePresetFormStopRow;
    window.movePresetFormStopRow = root.movePresetFormStopRow;
    window.savePresetRouteForm = root.savePresetRouteForm;
    window.deleteCustomPresetRoute = root.deleteCustomPresetRoute;
    window.getAllPresetRoutes = root.getAllPresetRoutes;
    window.canManagePresetRoutes = root.canManagePresetRoutes;
  }
})();
