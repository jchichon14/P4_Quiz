const {models} = require('./model');
const {log, biglog, errorlog, colorize}= require("./out");
const Sequelize = require('sequelize');
/**
*Muestra la ayuda.
*@param rl Objeto readline usado para implementar CLI.
*/
exports.helpCmd = rl => {
  log("Comandos:");
  log(" h|help - Muestra esta ayuda.");
  log(" list - Listar los quizzes existentes.");
  log(" show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
  log(" add - Añadir un nuevo quiz internamente.");
  log(" delete <id> - Borrar el quiz indicado.");
  log(" edit <id> - Editar el quiz indicado.");
  log(" test <id> - Probar el quiz indicado.");
  log(" p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
  log(" credits - Créditos.");
  log(" q|quit - Salir del programa.");
  rl.prompt();
};
/**
*Lista todos los quizzes existentes en el Modelo
*
*@param rl Objeto readline usado para implementar CLI.
*/
exports.listCmd = rl => {

  models.quiz.findAll()
  .each(quiz => {
      log(`[${colorize(quiz.id,'magenta')}]: ${quiz.question}`);
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });
};


/**
*Esta funcion devuelve una promesa que:
*  -Valida que se ha introducido un valor para el parámetro.
*  -Convierte el parámetro en un número entero.
*Si todo va bien, la promesa se satisface y devuelve el valor de id a usar.
*
*@param id Parámetro con el índice a validar.
*/
const validateId = id => {

  return new Sequelize.Promise((resolve,reject) => {
    if(typeof id == "undefined"){
      reject(new Error(`Falta el paraámetro <id>.`));
    }else{
      id=parseInt(id); //coger la parte entera y descartar lo restante
      if(Number.isNaN(id)){
        reject(new Error(`El valor del parámetro <id> no es un número.`));
      }else {
        resolve(id);
      }
    }
  });
};

/**
*Muestra el quiz indicado en el parámtro: la pregunta y la respuesta
*
*@param rl Objeto readline usado para implementar CLI.
*@param id Clave del quiz a mostrar.
*/
exports.showCmd = (rl,id) => {

validateId(id)
.then(id => models.quiz.findById(id))
.then(quiz => {
    if(!quiz){
      throw new Error(`No existe un quiz asociado al id=${id}.`);
    }
    log(`[${colorize(quiz.id, 'magenta')}]:  ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
})
.catch(error=> {
  errorlog(error.message);
})
.then(() => {

  rl.prompt();
});
};


/**
*Esta función convierte la llamada rl.question, que está basada en callbacks, en pregunta
*basada en promesas.
*
*Esta función devuelve una promesa que cuando se cumple, proporciona el texto introducido
*Entonces la llamada a then que hay que hacer la promesa devuelta será:
*    .then(answer => {.....})
*
*También colorea en rojo el texto de la pregunta, elimina los espacios al principio y al final.
*
*@param rl Objeto readline usado para implementar el CLI.
*@param text Pregunta que hay que hacerle al usuario.
*/
const makeQuestion = (rl,text) =>{

  return new Sequelize.Promise((resolve, reject) => {
    rl.question(colorize(text,'red'),answer => {
      resolve(answer.trim());
    });
  });
};



/**
*Añade un nuevo quiz al modelo.
*Pregunta interactivamente por la pregunta y por la respuesta
*
*@param rl Objeto readline usado para implementar CLI.
*/
exports.addCmd = rl => {
      makeQuestion(rl,'Introduzca una pregunta: ')
      .then(q => {
        return makeQuestion(rl, 'Introduzca la respuesta: ')
        .then(a => {
          return {question: q, answer: a};
        });
      })
      .then(quiz => {
        return models.quiz.create(quiz);
      })
      .then(quiz => {
        log(` ${colorize('Se ha añadido','magenta')}: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
      })
      .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erróneo:');
        error.errors.forEach(({message}) => errorlog(message));
      })
      .catch(error => {
        errorlog(error.message);
      })
      .then(() =>{
        rl.prompt();
      });
};
/**
*Borra el quiz indicado del modelo.
*
*@param rl Objeto readline usado para implementar CLI.
*@param id Clave del quiz a borrar del modelo.
*/
exports.deleteCmd = (rl,id) => {

  validateId(id)
  .then(id => models.quiz.destroy({where: {id}}))
  .catch(error => {
    errorlog(error.message);
  })
  .then(() => {
    rl.prompt();
  });
};
/**
*Edita el quiz indicado del modelo.
*
*@param rl Objeto readline usado para implementar CLI.
*@param id Clave del quiz a editar en el modelo.
*/
exports.editCmd = (rl,id) => {
  validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if(!quiz){
      throw new Error(`No existe un quiz asociado al id =${id}.`);
    }

    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
    return makeQuestion(rl,'Introduzca la pregunta: ')
    .then(q => {
      process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);
      return makeQuestion(rl, 'Introduzca la respesta: ')
      .then(a => {
        quiz.question =q;
        quiz.answer =a;
        return quiz;
      });
    });
  })
  .then(quiz => {
    return quiz.save();
  })
  .then(quiz => {
    log(`Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer} `)
  })
  .catch(Sequelize.ValidationError, error => {
    errorlog('El quiz es erroneo: ');
    error.errors.forEach(({message}) => errorlog(message));
  })
  .catch(error => {
    errorlog(error.message);
  })
  .then(() =>{
    rl.prompt();
  });

};
/**
*Prueba el quiz indicado del sistema.
*
*@param rl Objeto readline usado para implementar CLI.
*@param id Clave del quiz a probar.
*/
exports.testCmd = (rl,id) => {
  validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if(!quiz){
      throw new Error(`No existe un quiz asociado al id =${id}.`);
    }

    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
    return makeQuestion(rl,`${quiz.question} ? `)
    .then(a => {

        if(a.trim() === quiz.answer){
          log("Su respesta es correcta.");
          biglog("CORRECTO","green");
          return quiz;
        }else{
          log("Su respesta es incorrecta.");
          biglog("INCORRECTO","red");
        }
     });
    })
    .catch(Sequelize.ValidationError, error => {
      errorlog('El quiz es erroneo: ');
      error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
      errorlog(error.message);
    })
    .then(() =>{
      rl.prompt();
    });
};





/**
*Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
*Se gana si se contesta a todos satisfactoriamente.
*
*@param rl Objeto readline usado para implementar CLI.

*/
exports.playCmd = rl => {

 let score=0;
 let toBeResolved =[];
 let id=1;
 let numberQuestions=0;
 models.quiz.findAll()
 .each(quiz => {
    toBeResolved[quiz.id-1]=quiz.id;
    numberQuestions++;

 })
 .then( playOne = () => {
   let id =Math.round(Math.random()*(toBeResolved.length-1));

   //log(`${id} teorica`)
   if(id ===-1 ){
     id =toBeResolved[0];
   }
   //log(`${id} final`)
   validateId(id)
   .then(id => models.quiz.findById(toBeResolved[id]))
   .then(quiz => {
     if(!quiz){
       throw new Error(`No existe un quiz asociado al id =${id}.`);
     }

     process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
     return makeQuestion(rl,`${quiz.question} ? `)
     .then(a => {

         if(a.trim() === quiz.answer){
           score++;
           log(` CORRECTO - Lleva ${score} aciertos.`);
           toBeResolved.splice(id,1);

           //log(`el id en este caso es : ${id}  `);
           //log(`Queda el id número :    ${toBeResolved}`);
                    if(score< numberQuestions){
                            playOne();
                    }else{
                       log("No hay preguntas.");
                       log(`Fin del juego. Aciertos : ${score} `);
                       biglog(`${score} `,'green')
                       rl.prompt()
                       return quiz;
                    }
         }else{
           log("INCORRECTO");
           log(`Fin del juego. Aciertos : ${score} `);
           biglog(`${score} `,'red');
           rl.prompt();
         }
      });
     })
     .catch(Sequelize.ValidationError, error => {
       errorlog('El quiz es erroneo: ');
       error.errors.forEach(({message}) => errorlog(message));
     })
     .catch(error => {
       errorlog(error.message);
     })




 })
 .then(() =>{

   rl.prompt();
 });

};

/*
   playOne= () => {


 validateId(id)
 .then(id => models.quiz.findById(id))
 .then(quiz => {
   if(!quiz){
     throw new Error(`No existe un quiz asociado al id =${id}.`);
   }

   process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
   return makeQuestion(rl,`${quiz.question} ? `)
   .then(a => {

       if(a.trim() === quiz.answer){
         score++;
         log(` CORRECTO - Lleva ${score} aciertos.`);
         toBeResolved.splice(id,1);

         log(`${toBeResolved}`);
         playOne();
         return quiz;
       }else{
         log("INCORRECTO");
         log(`Fin del juego. Aciertos : ${score} `);
         biglog(`${score} `,'red');
       }
    });
   })
   .catch(Sequelize.ValidationError, error => {
     errorlog('El quiz es erroneo: ');
     error.errors.forEach(({message}) => errorlog(message));
   })
   .catch(error => {
     errorlog(error.message);
   })
   .then(() =>{

     rl.prompt();
   });

};
playOne();

};
/*
const playOne = () => {
 let id =Math.round(Math.random()*(toBeResolved.length));

 if(id ===-1 || id === 0){
   id =toBeResolved[1];
 }

  validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if(!quiz){
      throw new Error(`No existe un quiz asociado al id =${id}.`);
    }

    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
    return makeQuestion(rl,`${quiz.question} ? `)
    .then(a => {

        if(a.trim() === quiz.answer){
          score++;
          log(` CORRECTO - Lleva ${score} aciertos.`);
          toBeResolved.splice(id,1);
          playOne();
          return quiz;
        }else{
          log("INCORRECTO");
          log(`Fin del juego. Aciertos : ${score} `);
          biglog(`${score} `,'red');
        }
     });
    })
    .catch(Sequelize.ValidationError, error => {
      errorlog('El quiz es erroneo: ');
      error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
      errorlog(error.message);
    })
    .then(() =>{

      rl.prompt();
    });
  };
  playOne();
  };

    /**





let score=0;
let toBeResolved =[];
let numberQuestions= models.quiz.count();
for(i=0; i< numberQuestions; i++){
  toBeResolved[i]=i;
}
console.log(models.quiz.count());

const playOne = () => {
  if(toBeResolved.length ===0){
    log("No hay preguntas.");
    log(`Fin del juego. Aciertos : ${score} `);
    biglog(`${score} `,'green')
    rl.prompt()
  }else{
    let id =Math.round(Math.random()*(toBeResolved.length)-1);

    if(id ===-1){
      id++;
    }
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
      if(!quiz){
        throw new Error(`No existe un quiz asociado al id =${id}.`);
      }

      process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
      return makeQuestion(rl,`${quiz.question} ? `)
      .then(a => {

          if(a.trim() === quiz.answer){
            score++;
            log(` CORRECTO - Lleva ${score} aciertos.`);
            toBeResolved.splice(id,1);
            playOne();
          }else{
            log("INCORRECTO");
            log(`Fin del juego. Aciertos : ${score} `);
            biglog(`${score} `,'red');
            rl.prompt();
          }
       });
      })
      .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erroneo: ');
        error.errors.forEach(({message}) => errorlog(message));
      })
      .catch(error => {
        errorlog(error.message);
      })
      .then(() =>{
        rl.prompt();
      });

  }
}
playOne();
};

  /**
    let score = 0;
    let toBeResolved = [];
    let numberQuestions=model.count();
    for( i =0; i< numberQuestions ; i++){
      toBeResolved[i]=i;
    }

    const playOne = () => {

          if(toBeResolved.length === 0){
            log("No hay preguntas.");
            log(`Fin del juego. Aciertos : ${score} `);
             biglog(`${score} `,'green')
            rl.prompt()
          }else{

            let id =Math.round(Math.random()*(toBeResolved.length)-1);

            if(id ===-1){
              id++;
            }

            ;


            const quiz =model.getByIndex(toBeResolved[id]);


            rl.question(`${quiz.question} ? `,answer =>{
               if(answer.trim() === quiz.answer){
                 score++;
                 log(` CORRECTO - Lleva ${score} aciertos.`);
                 toBeResolved.splice(id,1);


                 playOne();
               }else{
                 log("INCORRECTO");
                 log(`Fin del juego. Aciertos : ${score} `);
                 biglog(`${score} `,'red');
                 rl.prompt();
               }

          });
      }}
      playOne();
      **/



/**
*Muestra los nombres de los autores de la práctica.
*
*@param rl Objeto readline usado para implementar CLI.
*/
exports.creditsCmd = rl => {
    log("Autor de la práctica:");
    log("JULIAN","green");

    rl.prompt();
};
/**
*Termina el programa.
*
*@param rl Objeto readline usado para implementar CLI.
*/
exports.quitCmd = rl => {
    rl.close();
};
