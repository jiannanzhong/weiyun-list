<?php

namespace ctCloud\app\exception;


class ApiException extends \Exception
{
    protected $errorCode;

    public function __construct($errorCode, $msg)
    {
        parent::__construct($msg);
        $this->errorCode = $errorCode;
    }

    public function getErrorCode()
    {
        return $this->errorCode;
    }
}