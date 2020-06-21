<?php

use Slim\App;
use Slim\Http\Request;
use Slim\Http\Response;

return function (App $app) {
    $container = $app->getContainer();

    $app->get('/', function (Request $request, Response $response, array $args) {
        return $response->withRedirect('/user/home/index');
    });

    $app->get('/uTool/renew', function (Request $request, Response $response, array $args) {
        return $response->withStatus(204);
    });

    $app->group('/user', function () {
        $this->get('/login', \ctCloud\app\controller\user\ControllerUser::class . ':login');
        $this->post('/login.do', \ctCloud\app\controller\user\ControllerUser::class . ':doLogin');
        $this->get('/logout', \ctCloud\app\controller\user\ControllerUser::class . ':logout');

        $this->group('/home', function () {
            $this->group('', function () {
                $this->get('/index', \ctCloud\app\controller\user\ControllerIndex::class . ':index');
                $this->get('/index.do', \ctCloud\app\controller\user\ControllerIndex::class . ':doIndex');
            })->add(new \ctCloud\app\mid\UserAuthMid());
            $this->get('/file/download/{file_id}/{token}/{file_name}', \ctCloud\app\controller\user\ControllerDir::class . ':download');
            $this->post('/file/renameTag.do',\ctCloud\app\controller\user\ControllerIndex::class . ':doRenameTag');
        });
    });

    $app->get('/slim/[{name}]', function (Request $request, Response $response, array $args) use ($container) {
        // Sample log message
        $container->get('logger')->info("Slim-Skeleton '/' route");

        // Render index view
        return $container->get('renderer')->render($response, 'index.phtml', $args);
    });
};
