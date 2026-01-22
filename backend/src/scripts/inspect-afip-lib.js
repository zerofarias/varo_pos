const afipApis = require('afip-apis');
console.log('Exportaciones de afip-apis:', afipApis);
try {
    const instance = new afipApis({});
    console.log('Se puede instanciar con new afipApis()');
} catch (e) {
    console.log('Error al instanciar directo:', e.message);
}
