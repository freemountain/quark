#include <QDebug>
#include "app.h"

int main(int argc, char* argv[]) {
  App* a = new App(argc, argv);

  a->exec();
}
