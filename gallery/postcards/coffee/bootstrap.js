window.COFFEE_VALUES = await fetch('./values.json', { cache: 'no-store' }).then(response => response.json());
await import('./scene.js');
await import('./authoring.js');
