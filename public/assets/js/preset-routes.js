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
   * Obtiene lista filtrada de rutas
   */
  root.getPresetRoutes = function (categoryFilter = 'all', query = '') {
    const qNorm = normalizeGeoText(query);
    return PRESET_ROUTES.filter(route => {
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

  /**
   * Busca si una parada o lista de paradas tiene continuidades recomendadas
   */
  root.findContinuityRecommendations = function (existingStopNames = []) {
    if (!existingStopNames || !existingStopNames.length) return [];
    const normExisting = existingStopNames.map(name => normalizeGeoText(name)).filter(Boolean);

    const matches = [];
    PRESET_ROUTES.forEach(route => {
      (route.continuations || []).forEach(cont => {
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

  /**
   * Adjunta una ruta del catálogo a un nuevo plan general o al plan actual
   */
  root.attachPresetRouteToPlan = async function (routeId, asNewPlan = true) {
    const route = PRESET_ROUTES.find(r => r.id === routeId);
    if (!route) {
      if (typeof notify === 'function') notify('Ruta no encontrada en el catálogo.', 'err');
      return;
    }

    if (typeof isPlanReadOnly === 'function' && isPlanReadOnly()) {
      if (typeof notify === 'function') notify('Modo de solo lectura.', 'err');
      return;
    }

    // Si estamos en la página de rutas.html (Mis Rutas)
    if (typeof document !== 'undefined' && document.body?.classList.contains('routes-page')) {
      return attachPresetRouteToRutasPage(route);
    }

    // Si estamos en planificar.html
    const targetStops = route.stops;
    const builtStops = [];

    targetStops.forEach((stopName, idx) => {
      const match = findSystemLocationMatch(stopName);
      if (match && match.type === 'equipment') {
        builtStops.push({
          id: (typeof gid === 'function' ? gid('p') : 'p_' + Date.now() + '_' + idx),
          type: 'equipment',
          equipmentId: match.equipmentId,
          linkedNodeIds: (typeof getEquipmentLinkedNodeIds === 'function' ? getEquipmentLinkedNodeIds(match.equipmentId) : []),
          includeLinkedNodeDetails: false,
          name: match.name,
          lat: match.lat,
          lng: match.lng,
          detailIds: [],
          notes: `Parada ${idx + 1} de ${route.name}`,
          materialPlanned: '',
          assignedTechId: '',
          siteStatus: 'pendiente',
          createdAt: new Date().toISOString()
        });
      } else if (match && match.type === 'node') {
        builtStops.push({
          id: (typeof gid === 'function' ? gid('p') : 'p_' + Date.now() + '_' + idx),
          type: 'manual',
          name: match.name,
          lat: match.lat,
          lng: match.lng,
          region: match.region || '',
          detailIds: [],
          notes: `Parada ${idx + 1} de ${route.name} (Pueblo registrado)`,
          materialPlanned: '',
          assignedTechId: '',
          siteStatus: 'pendiente',
          createdAt: new Date().toISOString()
        });
      } else {
        builtStops.push({
          id: (typeof gid === 'function' ? gid('p') : 'p_' + Date.now() + '_' + idx),
          type: 'manual',
          name: stopName,
          lat: 17.5500, // Coordenada base central Guerrero
          lng: -99.5000,
          region: '',
          detailIds: [],
          notes: `Parada ${idx + 1} de ${route.name}`,
          materialPlanned: '',
          assignedTechId: '',
          siteStatus: 'pendiente',
          createdAt: new Date().toISOString()
        });
      }
    });

    if (asNewPlan) {
      // Crear un nuevo plan con el nombre de la ruta
      const planName = route.name;
      const plan = {
        id: (typeof gid === 'function' ? gid('gp') : 'gp_' + Date.now()),
        name: planName,
        createdAt: new Date().toISOString(),
        assignedTechId: '',
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

      root.state.weekPlan[SHARED_ID]._generalPlans.push(plan);
      if (typeof selectedGeneralPlanId !== 'undefined') root.selectedGeneralPlanId = plan.id;
      if (typeof selectedTechId !== 'undefined') root.selectedTechId = SHARED_ID;
      if (typeof selectedDay !== 'undefined') root.selectedDay = 'general';

      const techSelect = document.getElementById('plan-tech');
      const daySelect = document.getElementById('plan-day');
      const generalSelect = document.getElementById('general-plan-select');
      if (techSelect) techSelect.value = SHARED_ID;
      if (daySelect) daySelect.value = 'general';
      if (generalSelect) generalSelect.value = plan.id;

      if (typeof saveDB === 'function') await saveDB();
      if (typeof renderPlan === 'function') renderPlan();

      const refreshedSelect = document.getElementById('general-plan-select');
      if (refreshedSelect) refreshedSelect.value = plan.id;

      if (typeof CM === 'function') CM('preset-routes-mo');
      if (typeof notify === 'function') {
        notify(`Nueva ruta "${planName}" creada con ${builtStops.length} paradas ✓`);
      }
    } else {
      // Agregar al plan actual
      if (typeof getPlanStopsRef === 'function') {
        const stopsRef = getPlanStopsRef();
        stopsRef.push(...builtStops);
        if (typeof saveDB === 'function') await saveDB();
        if (typeof renderPlan === 'function') renderPlan();
        if (typeof CM === 'function') CM('preset-routes-mo');
        if (typeof notify === 'function') {
          notify(`Se adjuntaron ${builtStops.length} paradas de "${route.name}" al plan actual ✓`);
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
      const stopsHtml = route.stops.map((s, idx) => `
        <span class="preset-stop-chip" title="Parada ${idx + 1}">
          <span class="stop-num">${idx + 1}</span>
          <span class="stop-name">${escapeHtml(s)}</span>
        </span>
      `).join('');

      const continuationsHtml = (route.continuations || []).map(cont => `
        <div class="preset-continuation-box">
          <div class="continuation-head">
            <strong>💡 Continuidad: ${escapeHtml(cont.name)}</strong>
            ${cont.mapsUrl ? `<a href="${cont.mapsUrl}" target="_blank" rel="noopener noreferrer" class="preset-link-btn" title="Abrir en Google Maps">🗺️ Maps</a>` : ''}
          </div>
          <div class="continuation-stops">
            ${cont.stops.map(cs => `<span class="continuation-stop-pill">${escapeHtml(cs)}</span>`).join('')}
          </div>
        </div>
      `).join('');

      return `
        <div class="preset-route-card">
          <div class="preset-route-card-head">
            <div>
              <div class="preset-route-badges">
                <span class="preset-category-badge">${escapeHtml(route.category)}</span>
                <span class="preset-count-badge">${route.stops.length} paradas</span>
              </div>
              <h3 class="preset-route-title">${escapeHtml(route.name)}</h3>
            </div>
            ${route.mapsUrl ? `
              <a href="${route.mapsUrl}" target="_blank" rel="noopener noreferrer" class="preset-maps-btn" title="Ver trayecto en Google Maps">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>Google Maps</span>
              </a>
            ` : ''}
          </div>

          ${route.notes ? `<p class="preset-route-notes">${escapeHtml(route.notes)}</p>` : ''}

          <div class="preset-stops-flow">
            ${stopsHtml}
          </div>

          ${continuationsHtml}

          <div class="preset-card-actions">
            <button type="button" class="btn bc bsm preset-attach-btn" onclick="attachPresetRouteToPlan('${route.id}', true)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
              <span>Adjuntar a una ruta nueva</span>
            </button>
            <button type="button" class="btn bgh bsm" onclick="attachPresetRouteToPlan('${route.id}', false)" title="Agregar estas paradas al plan que se encuentra abierto actualmente">
              <span>+ Al plan actual</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  };

  /**
   * Abre el modal del catálogo de rutas
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
    currentPresetCategory = 'all';

    const tabs = document.querySelectorAll('.preset-cat-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === 'all');
    });

    root.renderPresetRoutesList();
    if (typeof OM === 'function') OM('preset-routes-mo');
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
            <button type="button" class="preset-dialog-close" onclick="CM('preset-routes-mo')" aria-label="Cerrar">✕</button>
          </div>

          <div class="preset-dialog-filterbar">
            <div class="preset-search-wrap">
              <span class="preset-search-icon">🔍</span>
              <input type="text" id="preset-routes-search" placeholder="Buscar por nombre de ruta, pueblo, antena o región..." oninput="debounceAction('preset-routes-search', renderPresetRoutesList)">
            </div>
            <div class="preset-cat-tabs" role="tablist">
              <button type="button" class="preset-cat-tab active" data-cat="all" onclick="selectPresetCategory('all')">Todas (${PRESET_ROUTES.length})</button>
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

  /**
   * Revisa si el plan actual tiene paradas que activan recomendaciones de continuidad
   */
  root.checkPlanContinuityRecommendations = function () {
    if (typeof document === 'undefined') return;
    const banner = document.getElementById('plan-continuity-recommendations-banner');
    if (!banner) return;

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
  root.addContinuityStopsToCurrentPlan = async function (continuityName) {
    let targetCont = null;
    let parentRoute = null;

    for (const route of PRESET_ROUTES) {
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
    const existingNorm = stopsRef.map(s => normalizeGeoText(s.name));

    const newStops = [];
    targetCont.stops.forEach((stopName, idx) => {
      const sNorm = normalizeGeoText(stopName);
      if (existingNorm.includes(sNorm)) return; // Ya existe en el plan

      const match = findSystemLocationMatch(stopName);
      if (match && match.type === 'equipment') {
        newStops.push({
          id: (typeof gid === 'function' ? gid('p') : 'p_' + Date.now() + '_' + idx),
          type: 'equipment',
          equipmentId: match.equipmentId,
          linkedNodeIds: (typeof getEquipmentLinkedNodeIds === 'function' ? getEquipmentLinkedNodeIds(match.equipmentId) : []),
          includeLinkedNodeDetails: false,
          name: match.name,
          lat: match.lat,
          lng: match.lng,
          detailIds: [],
          notes: `Continuidad: ${targetCont.name}`,
          materialPlanned: '',
          assignedTechId: '',
          siteStatus: 'pendiente',
          createdAt: new Date().toISOString()
        });
      } else if (match && match.type === 'node') {
        newStops.push({
          id: (typeof gid === 'function' ? gid('p') : 'p_' + Date.now() + '_' + idx),
          type: 'manual',
          name: match.name,
          lat: match.lat,
          lng: match.lng,
          region: match.region || '',
          detailIds: [],
          notes: `Continuidad: ${targetCont.name}`,
          materialPlanned: '',
          assignedTechId: '',
          siteStatus: 'pendiente',
          createdAt: new Date().toISOString()
        });
      } else {
        newStops.push({
          id: (typeof gid === 'function' ? gid('p') : 'p_' + Date.now() + '_' + idx),
          type: 'manual',
          name: stopName,
          lat: 17.5500,
          lng: -99.5000,
          region: '',
          detailIds: [],
          notes: `Continuidad: ${targetCont.name}`,
          materialPlanned: '',
          assignedTechId: '',
          siteStatus: 'pendiente',
          createdAt: new Date().toISOString()
        });
      }
    });

    if (!newStops.length) {
      if (typeof notify === 'function') notify('Todas las paradas de esta continuidad ya están en el plan.', 'warn');
      return;
    }

    stopsRef.push(...newStops);
    if (typeof saveDB === 'function') await saveDB();
    if (typeof renderPlan === 'function') renderPlan();

    if (typeof notify === 'function') {
      notify(`Se agregaron ${newStops.length} paradas de "${targetCont.name}" al plan ✓`);
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

    const popularRoutes = PRESET_ROUTES.filter(r => popularIds.includes(r.id));
    chipsContainer.innerHTML = popularRoutes.map(r => `
      <button type="button" class="plan-create-preset-chip" onclick="applyPresetRouteToCreateModal('${r.id}')" title="Cargar ${r.stops.length} paradas de ${escapeHtml(r.name)}">
        <span>🚗</span>
        <span>${escapeHtml(r.name.replace(/^Ruta\s+/i, ''))}</span>
        <small style="opacity:0.7">(${r.stops.length})</small>
      </button>
    `).join('');
  };

  /**
   * Al dar clic en un chip del modal de creación, llena el campo y crea el plan con las paradas
   */
  root.applyPresetRouteToCreateModal = function (routeId) {
    const route = PRESET_ROUTES.find(r => r.id === routeId);
    if (!route) return;

    const input = document.getElementById('plan-create-name');
    if (input) input.value = route.name;

    // Adjuntar la ruta directamente
    root.attachPresetRouteToPlan(routeId, true);
    if (typeof CM === 'function') CM('plan-create-mo');
  };
})();
