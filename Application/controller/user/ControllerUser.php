<?php

namespace ctCloud\app\controller\user;

use ctCloud\app\common\ParamChecker;
use ctCloud\app\mod\D;
use Slim\Container;
use Slim\Http\Request;
use Slim\Http\Response;
use Slim\Views\PhpRenderer;

class ControllerUser
{
    private $container;
    /**
     * @var PhpRenderer $renderer
     */
    private $renderer;

    public function __construct(Container $container)
    {
        $this->container = $container;
        $this->renderer = $container->get('renderer');
    }

    public function login(Request $req, Response $rsp, array $args)
    {
        $data = [];
        return $this->renderer->render($rsp, 'user/login.phtml', $data);
    }

    public function doLogin(Request $req, Response $rsp, array $args)
    {
        $body = $req->getParsedBody();
        ParamChecker::checkArrayKeyExist(['username', 'password'], $body);
        $d = D::getInstance();
        $user = $d->getUserInfoByUsername([
            'id', 'username', 'password', 'activated', 'root_dir_id'
        ], $body['username']);
        if (empty($user) || $user['password'] != md5($body['password']) || $user['activated'] != 1) {
            return $rsp->withJson([
                'code' => 1001,
                'msg' => '账号不正确'
            ]);
        }
        session_start();
        $_SESSION['user'] = $user;
        return $rsp->withJson([
            'code' => 0,
            'msg' => 'ok'
        ]);
    }

    public function logout(Request $req, Response $rsp, array $args)
    {
        $cookie = $req->getHeader('Cookie');
        if (!empty($cookie)) {
            session_start();
            session_destroy();
            session_register_shutdown();
            session_write_close();
        }
        return $rsp->withRedirect('/user/login');
    }
}